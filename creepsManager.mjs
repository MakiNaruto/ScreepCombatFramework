import {getObjectById, getObjectsByPrototype} from 'game/utils';
import {Creep, StructureSpawn} from 'game/prototypes';
import {ATTACK, CARRY, MOVE, RANGED_ATTACK, WORK} from 'game/constants';


export const MINER = makeCreepBodyList(new Map([[MOVE, 1], [WORK, 1], [CARRY, 1]]))
export const INFANTRY = makeCreepBodyList(new Map([[MOVE, 4], [ATTACK, 4]]))
export const TANK = makeCreepBodyList(new Map([[MOVE, 4], [RANGED_ATTACK, 4]]))
export const createQuene = new Map([
    // 兵种, 数量
    [MINER, 3],     // 矿兵
    [TANK, 9],      // 远程兵
    [INFANTRY, 5],  // 近战兵
]);


/** 获取母巢正在生成的士兵的ID
 * @param {StructureSpawn} spawn
 */
export function getSpawingCreepId(spawn){
    let spawningCreepId = null
    if (spawn.spawning){
        spawningCreepId = spawn.spawning.creep.id
        if (typeof(spawningCreepId) === 'string'){
            spawningCreepId = parseInt(spawningCreepId)
        }
    }
    return spawningCreepId
}


/** 将字典类型的简写部件转换为数组列表
 * @param {Map<string, number>} bodyTypeNums
 */
function makeCreepBodyList(bodyTypeNums){
    let bodyList = []
    for (let [bodyPart, nums] of bodyTypeNums) {
        for (let i = 0; i < nums; i++){
            bodyList.push(bodyPart)
        }
    }
    return bodyList
}


/** 对比两个数组是否完全相同
 * @param {any[]} arr1
 * @param {any[]} arr2
 */
function arraysEqual(arr1, arr2) {
    return JSON.stringify(arr1) === JSON.stringify(arr2);
}


/** 批量选择某种类型的兵种, 例如: 找出所有具有'攻击'能力的士兵
 * @param {Creep[]} creeps
 * @param {string} creepCapability
 */
export function creepsContainTypeSelect(creeps, creepCapability){

    let seleteCreeps = creeps.filter(
        creep => {
            return creep.body.some(action => action.type === creepCapability)
    })
    return seleteCreeps
}


/** 批量选择指定类型的兵种, 例如找出所有 `'移动' * 2 '攻击' * 2`的士兵
 * @param {Creep[]} creeps
 * @param {string[]} creepType
 */
export function creepsTargetTypeSelect(creeps, creepType){

    let seleteCreeps = creeps.filter(
        creep => {
            return arraysEqual(creep.body.map(body => body.type).sort(), creepType.sort()) 
    })
    return seleteCreeps
}


/** 返回批量选择指定类型的兵种数量
 * @param {string[]} creepType
 */
function creepsTargetTypeCount(creepType){
    let myCreeps = getObjectsByPrototype(Creep).filter(creep => creep.my);
    let seleteCreeps = creepsTargetTypeSelect(myCreeps, creepType)
    return seleteCreeps.length
}


/** 根据功能组件创建士兵
 * @param {string[]} creepType
 * @param {StructureSpawn} mySpawn
 */
function creepCreate(mySpawn, creepType){
    if (!mySpawn.spawning){
        // console.log(creepType);
        let myCreep = mySpawn.spawnCreep(creepType).object;
        return myCreep
    }
}


/** 士兵创建计划, 根据计划动态创建兵种
 * @param {StructureSpawn[]} mySpawn
 */
export function creepsCreateControl(mySpawn){
    // TODO 
    // 1. 目前默认为初始母巢, 后续拓展多巢
    // 2. 使创建的兵种进行分组
    let spawn = mySpawn[0]
    // 按照指定顺序创建, 
    for (let [creepType, nums] of createQuene) {
        if (creepsTargetTypeCount(creepType) < nums){
            let newCreep = creepCreate(spawn, creepType)
            break
        }
    }
}


var allMyCreepsId = []
/** 记录所有自己的具有攻击手段的士兵, 即使其已经死亡.
 * @param {StructureSpawn[]} mySpawns
 */
export function recordAllCreepsId(mySpawns){
    let mySpawn = mySpawns[0]
    if (mySpawn.spawning){
        let creep = mySpawn.spawning.creep
        let spawningCreepId = creep.id
        if (typeof(spawningCreepId) == 'number'){
            spawningCreepId = spawningCreepId.toString()
        }
        // 仅添加有攻击手段的士兵
        if (creep.body.some(bodyPart => bodyPart.type === ATTACK) || 
            creep.body.some(bodyPart => bodyPart.type === RANGED_ATTACK)){
            // 若列表为空 或 列表最后一名id未添加过
            if (allMyCreepsId.length === 0 || (allMyCreepsId.length > 0 && allMyCreepsId[allMyCreepsId.length - 1] !== spawningCreepId)) {
                allMyCreepsId.push(spawningCreepId)
            }
        }
    }

    let myFighterCreeps = allMyCreepsId.map(CreepID => getObjectById(CreepID));
    return myFighterCreeps
}