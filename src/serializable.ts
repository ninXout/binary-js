import { SmartBuffer } from 'smart-buffer';

export abstract class FieldType<T = any> {
    abstract getSize(): number
    abstract write(view: SmartBuffer, offset: number, value: T): number
    abstract read(view: SmartBuffer, offset: number): { value: T; bytesRead: number }
}

export type FieldMetadata = {
    key: string
    type: FieldType<any>
}

const fieldMetadataKey = Symbol("fields")

export type FieldTypeCtor<T = any> = new () => FieldType<T>

export type SerializableCtor<T extends Serializable = any> = {
    new (): T
    deserialize(buffer: Buffer): T
    from(data: Partial<T>): T
}

export class SerializableField<T extends Serializable> extends FieldType<T> {
    private lastSize = 0

    constructor(private ctor: SerializableCtor<T>) {
        super()
    }

    getSize(): number {
        return this.lastSize
    }

    write(view: SmartBuffer, offset: number, value: T): number {
        const buf = value.serialize()
        const size = buf.byteLength

        this.lastSize = size
        view.writeBuffer(buf, offset)

        return size
    }

    read(view: SmartBuffer, offset: number) {
        const full = view.toBuffer()
        const slice = full.subarray(offset)

        const value = this.ctor.deserialize(slice)

        const size = value.serialize().byteLength
        this.lastSize = size

        return {
            value,
            bytesRead: size
        }
    }

    createFrom(data: any): T {
        if (data instanceof this.ctor) return data
        return this.ctor.from(data)
    }
}

export function resolveFieldType<T>(
    type: FieldTypeCtor<T> | SerializableCtor<any>
): FieldType<T> {
    if (FieldType.prototype.isPrototypeOf(type.prototype)) {
        return new (type as FieldTypeCtor<T>)()
    }

    if (Serializable.prototype.isPrototypeOf(type.prototype)) {
        return new SerializableField(type as SerializableCtor<any>) as FieldType<T>
    }

    throw new Error("Invalid field type")
}

export function field(type: FieldTypeCtor | SerializableCtor) {
    return function (_: any, context: ClassFieldDecoratorContext) {
        const key = context.name as string

        context.addInitializer(function () {
            const ctor = (this as any).constructor

            if (!Object.prototype.hasOwnProperty.call(ctor, fieldMetadataKey)) {
                const parent = Object.getPrototypeOf(ctor)
                ctor[fieldMetadataKey] = parent?.[fieldMetadataKey]
                    ? [...parent[fieldMetadataKey]]
                    : []
            }

            const fields: FieldMetadata[] = ctor[fieldMetadataKey]

            if (fields.some(f => f.key === key)) return

            fields.push({
                key,
                type: resolveFieldType(type)
            })
        })
    }
}

function getAllFields(ctor: any): FieldMetadata[] {
    return ctor[fieldMetadataKey] ?? []
}

export abstract class Serializable {
    serialize(): Buffer {
        const ctor = this.constructor as any
        const fields = getAllFields(ctor)

        const buffer = new SmartBuffer()

        let offset = 0

        for (const field of fields) {
            const value = (this as any)[field.key]
            const written = field.type.write(buffer, offset, value)
            offset += written
        }

        return buffer.toBuffer()
    }

    static deserialize<T>(this: new () => T, buffer: Buffer): T {
        const instance = new this()
        const fields = getAllFields(this)

        let offset = 0

        for (const field of fields) {
            const slice = buffer.subarray(offset)
            const view = SmartBuffer.fromBuffer(slice)

            const { value, bytesRead } = field.type.read(view, 0)
            ;(instance as any)[field.key] = value

            offset += bytesRead
        }

        return instance
    }

    static from<T extends Serializable>(
        this: new () => T,
        data?: Partial<T>
    ): T {
        const instance = new this()
        
        if (data) {
            const fields = getAllFields(this)

            for (const field of fields) {
                if (!(field.key in data)) continue

                let value = (data as any)[field.key]

                if (field.type instanceof SerializableField) {
                    value = field.type.createFrom(value)
                }

                ;(instance as any)[field.key] = value
            }
        }

        return instance
    }
}