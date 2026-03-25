import { SmartBuffer } from "smart-buffer";
import { FieldType, Serializable } from "./serializable"

export class UInt8 extends FieldType<number> {
    getSize(): number {
        return 1
    }

    write(view: SmartBuffer, offset: number, value: number): number {
        view.writeUInt8(value, offset)
        return 1
    }

    read(view: SmartBuffer, offset: number): { value: number; bytesRead: number } {
        return { value: view.readUInt8(offset), bytesRead: 1 }
    }
}

export class UInt16LE extends FieldType<number> {
    getSize(): number {
        return 2
    }

    write(view: SmartBuffer, offset: number, value: number): number {
        view.writeUInt16LE(value, offset)
        return 2
    }

    read(view: SmartBuffer, offset: number): { value: number; bytesRead: number } {
        return { value: view.readUInt16LE(offset), bytesRead: 2 }
    }
}

export class UInt32LE extends FieldType<number> {
    getSize(): number {
        return 4
    }

    write(view: SmartBuffer, offset: number, value: number): number {
        view.writeUInt32LE(value, offset)
        return 4
    }

    read(view: SmartBuffer, offset: number): { value: number; bytesRead: number } {
        return { value: view.readUInt32LE(offset), bytesRead: 4 }
    }
}

export class UInt64LE extends FieldType<bigint> {
    getSize(): number {
        return 8
    }

    write(view: SmartBuffer, offset: number, value: bigint): number {
        view.writeBigUInt64LE(value, offset)
        return 8
    }

    read(view: SmartBuffer, offset: number): { value: bigint; bytesRead: number } {
        return { value: view.readBigUInt64LE(offset), bytesRead: 8 }
    }
}