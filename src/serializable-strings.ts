import { SmartBuffer } from "smart-buffer";
import { FieldType, Serializable } from "./serializable"

export class SString extends FieldType<string> {
    private underlying: string = ""

    getSize(): number {
        return this.underlying.length + 2 // compensating for size
    }

    write(view: SmartBuffer, offset: number, value: string): number {
        this.underlying = value
        view.writeUInt16LE(this.underlying.length, offset)
            .writeString(this.underlying, offset + 2)
        return this.underlying.length + 2
    }

    read(view: SmartBuffer, offset: number): { value: string; bytesRead: number } {
        const size = view.readUInt16LE(offset)
        view.readOffset = offset + 2 // why is this the only way
        this.underlying = view.readString(size)
        return { value: this.underlying, bytesRead: this.getSize() }
    }
}