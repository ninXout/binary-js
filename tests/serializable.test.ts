import { field, Serializable } from "../src";
import { SArray, SMap, SVector } from "../src/serializable-arrays";
import { UInt32LE, UInt8 } from "../src/serializable-numbers";
import { String } from "../src/serializable-strings";

class Packet extends Serializable {
    @field(UInt32LE) packetID = 0
}

class MovePacket extends Packet {
    @field(UInt8) percent = 0
    @field(String) str = "thing"
    @field(SVector.of(UInt8)) arr = [0, 1, 2, 3, 4]
    @field(SMap.of(UInt8, UInt8)) map = new Map<number, number>().set(0, 1)
}

test('Simple serialization tests', () => {
    const testID = 89273

    let newPack = new Packet()
    newPack.packetID = testID

    const newPackSR = newPack.serialize();
    const newPackAgain = Packet.deserialize(newPackSR)

    expect(newPackAgain.packetID).toBe(testID)
});

test('Inheritance tests', () => {
    const testID = 89273

    let move = new MovePacket();
    move.packetID = testID
    move.percent = 98

    const moveSerial = move.serialize();
    const moveDeserial = MovePacket.deserialize(moveSerial)

    expect(moveDeserial.packetID).toBe(testID)
})

test('String tests', () => {
    let move = new MovePacket();
    
    const moveSerial = move.serialize();
    const moveDeserial = MovePacket.deserialize(moveSerial)

    expect(move.str).toBe(moveDeserial.str)
})