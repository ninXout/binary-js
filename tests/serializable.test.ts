import { field, Serializable } from "../src";
import { SArray, SMap, SVector } from "../src/serializable-arrays";
import { SUInt32LE, SUInt8 } from "../src/serializable-numbers";
import { SString } from "../src/serializable-strings";

class Packet extends Serializable {
    @field(SUInt32LE) packetID = 0
}

class MovePacket extends Packet {
    @field(SUInt8) percent = 0
    @field(SString) str = "thing"
    @field(SVector.of(SUInt8)) arr = [0, 1, 2, 3, 4]
    @field(SMap.of(SUInt8, SUInt8)) map = new Map<number, number>().set(0, 1)
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