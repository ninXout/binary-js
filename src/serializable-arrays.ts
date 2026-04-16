import { FieldType, resolveFieldType, FieldTypeCtor, SerializableCtor } from "./serializable";
import { SmartBuffer } from "smart-buffer";

type InferField<T> =
    T extends FieldTypeCtor<infer U> ? U :
    T extends SerializableCtor<infer U> ? U :
    never;

export class SArray<T = any> extends FieldType<T[]> {
    elementType: FieldType<T>;
    length: number;

    constructor(type: any, length: number) {
        super();
        this.elementType = resolveFieldType(type);
        this.length = length;
    }

    static of<TCtor extends FieldTypeCtor<any> | SerializableCtor<any>>(
        type: TCtor,
        length: number
    ): new () => SArray<InferField<TCtor>> {
        return class extends SArray<InferField<TCtor>> {
            constructor() {
                super(type, length);
            }
        };
    }

    getSize(): number {
        return this.elementType.getSize() * this.length;
    }

    write(view: SmartBuffer, offset: number, value: T[]): number {
        let bytes = 0;
        for (let i = 0; i < this.length; i++) {
            bytes += this.elementType.write(view, offset + bytes, value[i]);
        }
        return bytes;
    }

    read(view: SmartBuffer, offset: number) {
        const result: T[] = [];
        let bytes = 0;

        for (let i = 0; i < this.length; i++) {
            const { value, bytesRead } = this.elementType.read(view, offset + bytes);
            result.push(value);
            bytes += bytesRead;
        }

        return { value: result, bytesRead: bytes };
    }
}

export class SVector<T = any> extends FieldType<T[]> {
    elementType: FieldType<T>;

    constructor(type: any) {
        super();
        this.elementType = resolveFieldType(type);
    }

    static of<TCtor extends FieldTypeCtor<any> | SerializableCtor<any>>(
        type: TCtor
    ): new () => SVector<InferField<TCtor>> {
        return class extends SVector<InferField<TCtor>> {
            constructor() {
                super(type);
            }
        };
    }

    getSize(): number {
        return 0;
    }

    write(view: SmartBuffer, offset: number, value: T[]): number {
        let bytes = 0;

        view.writeUInt16LE(value.length, offset + bytes);
        bytes += 2;

        for (const item of value) {
            bytes += this.elementType.write(view, offset + bytes, item);
        }

        return bytes;
    }

    read(view: SmartBuffer, offset: number) {
        let bytes = 0;

        const length = view.readUInt16LE(offset + bytes);
        bytes += 2;

        const result: T[] = [];

        for (let i = 0; i < length; i++) {
            const { value, bytesRead } = this.elementType.read(view, offset + bytes);
            result.push(value);
            bytes += bytesRead;
        }

        return { value: result, bytesRead: bytes };
    }
}

export class SMap<K = any, V = any> extends FieldType<Map<K, V>> {
    keyType: FieldType<K>;
    valueType: FieldType<V>;

    constructor(keyType: any, valueType: any) {
        super();
        this.keyType = resolveFieldType(keyType);
        this.valueType = resolveFieldType(valueType);
    }

    static of<
        KCtor extends FieldTypeCtor<any> | SerializableCtor<any>,
        VCtor extends FieldTypeCtor<any> | SerializableCtor<any>
    >(
        keyType: KCtor,
        valueType: VCtor
    ): new () => SMap<InferField<KCtor>, InferField<VCtor>> {
        return class extends SMap<
            InferField<KCtor>,
            InferField<VCtor>
        > {
            constructor() {
                super(keyType, valueType);
            }
        };
    }

    getSize(): number {
        return 0;
    }

    write(view: SmartBuffer, offset: number, value: Map<K, V>): number {
        let bytes = 0;

        view.writeUInt16LE(value.size, offset + bytes);
        bytes += 2;

        for (const [key, val] of value.entries()) {
            bytes += this.keyType.write(view, offset + bytes, key);
            bytes += this.valueType.write(view, offset + bytes, val);
        }

        return bytes;
    }

    read(view: SmartBuffer, offset: number) {
        let bytes = 0;

        const size = view.readUInt16LE(offset + bytes);
        bytes += 2;

        const result = new Map<K, V>();

        for (let i = 0; i < size; i++) {
            const keyRes = this.keyType.read(view, offset + bytes);
            bytes += keyRes.bytesRead;

            const valRes = this.valueType.read(view, offset + bytes);
            bytes += valRes.bytesRead;

            result.set(keyRes.value, valRes.value);
        }

        return { value: result, bytesRead: bytes };
    }
}