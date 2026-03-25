import { FieldType, resolveFieldType, FieldTypeCtor } from "./serializable";
import { SmartBuffer } from "smart-buffer";

export class SArray<T = any> extends FieldType<T[]> {
    elementType: FieldType;
    length: number;

    constructor(type: FieldTypeCtor, length: number) {
        super();
        this.elementType = resolveFieldType(type);
        this.length = length;
    }

    static of(type: FieldTypeCtor, length: number) {
        return class extends SArray {
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
    elementType: FieldType;

    constructor(type: FieldTypeCtor) {
        super();
        this.elementType = resolveFieldType(type);
    }

    static of(type: FieldTypeCtor) {
        return class extends SVector {
            constructor() {
                super(type);
            }
        };
    }

    getSize(): number {
        // dynamic sized, this is unreliable
        return 0;
    }

    write(view: SmartBuffer, offset: number, value: T[]): number {
        let bytes = 0;

        view.writeUInt32LE(value.length, offset + bytes);
        bytes += 4;

        for (const item of value) {
            bytes += this.elementType.write(view, offset + bytes, item);
        }

        return bytes;
    }

    read(view: SmartBuffer, offset: number) {
        let bytes = 0;

        const length = view.readUInt32LE(offset + bytes);
        bytes += 4;

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
    keyType: FieldType;
    valueType: FieldType;

    constructor(keyType: FieldTypeCtor, valueType: FieldTypeCtor) {
        super();
        this.keyType = resolveFieldType(keyType);
        this.valueType = resolveFieldType(valueType);
    }

    static of(keyType: FieldTypeCtor, valueType: FieldTypeCtor) {
        return class extends SMap {
            constructor() {
                super(keyType, valueType);
            }
        };
    }

    getSize(): number {
        // dynamic sized, this is unreliable
        return 0;
    }

    write(view: SmartBuffer, offset: number, value: Map<K, V>): number {
        let bytes = 0;

        view.writeUInt32LE(value.size, offset + bytes);
        bytes += 4;

        for (const [key, val] of value.entries()) {
            bytes += this.keyType.write(view, offset + bytes, key);
            bytes += this.valueType.write(view, offset + bytes, val);
        }

        return bytes;
    }

    read(view: SmartBuffer, offset: number) {
        let bytes = 0;

        const size = view.readUInt32LE(offset + bytes);
        bytes += 4;

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