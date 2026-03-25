import { SmartBuffer } from 'smart-buffer';

export abstract class FieldType<T = any> {
    abstract getSize(): number
    abstract write(view: SmartBuffer, offset: number, value: T): number
    abstract read(view: SmartBuffer, offset: number): { value: T; bytesRead: number }
}

export type FieldMetadata = {
    key: string
    type: FieldType
}

const fieldMetadataKey = Symbol("fields")

export type FieldTypeCtor = new () => FieldType

export type SerializableCtor<T extends Serializable = any> = {
    new (): T
    deserialize(buffer: ArrayBuffer): T
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

        const value = this.ctor.deserialize(slice.buffer as ArrayBuffer)

        const size = value.serialize().byteLength
        this.lastSize = size

        return {
            value,
            bytesRead: size
        }
    }
}

export function resolveFieldType(type: FieldTypeCtor | SerializableCtor): FieldType {
    if (type.prototype instanceof FieldType) {
        return new (type as FieldTypeCtor)()
    }

    if (type.prototype instanceof Serializable) {
        return new SerializableField(type as SerializableCtor)
    }

    throw new Error("Invalid field type")
}

export function field(type: FieldTypeCtor | SerializableCtor) {
    return function (_: any, context: ClassFieldDecoratorContext) {
        const key = context.name as string

        context.addInitializer(function () {
            const ctor = (this as any).constructor

            if (!Object.prototype.hasOwnProperty.call(ctor, fieldMetadataKey)) {
                ctor[fieldMetadataKey] = []
            }

            const fields = ctor[fieldMetadataKey]

            let instance: FieldType

            if (type.prototype instanceof FieldType) {
                instance = new (type as FieldTypeCtor)()
            } else if (type.prototype instanceof Serializable) {
                instance = new SerializableField(type as SerializableCtor)
            } else {
                throw new Error("Invalid field type")
            }

            if (!fields.some((f: FieldMetadata) => f.key === key)) {
                fields.push({ key, type: instance })
            }
        })
    }
}

function getAllFields(ctor: any): FieldMetadata[] {
    const fields: FieldMetadata[] = []

    while (ctor && ctor !== Object) {
        if (ctor[fieldMetadataKey]) {
            fields.unshift(...ctor[fieldMetadataKey])
        }
        ctor = Object.getPrototypeOf(ctor)
    }

    return fields
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
}