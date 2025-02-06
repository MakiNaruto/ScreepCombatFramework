import {searchPath} from 'game/path-finder';
import {findClosestByRange, getObjectsByPrototype} from 'game/utils';
import {Creep, StructureContainer, StructureSpawn} from 'game/prototypes';
import {OK, ERR_NOT_IN_RANGE, RESOURCE_ENERGY, ATTACK, RANGED_ATTACK} from 'game/constants';
import {getSpawingCreepId} from './creepsManager.mjs';


/** 战斗策略1
 * @param {any[]} myFighterCreeps
 * @param {StructureSpawn} enemySpawn
 * @param {Creep[]} enemyCreeps
 */
function combatStrategyOne(myFighterCreeps, enemyCreeps, enemySpawn){
    let leader = myFighterCreeps[0]
    let enemy = leader.findClosestByPath(enemyCreeps)
    if (!enemy || !enemy.exists) {
        enemy = enemySpawn
    }
    allCreepsAttackImmediately(myFighterCreeps, enemy)
}


/** 战斗策略2 分组进行战斗, 等待所有组员集合完毕后出发
 * @param {StructureSpawn} enemySpawn
 * @param {any[]} myCreeps
 * @param {Creep[]} enemyCreeps
 */
function combatStrategyTwo(myCreeps, enemyCreeps, enemySpawn, groupNums=3){

    let mySpawn = getObjectsByPrototype(StructureSpawn).find(spawn => spawn.my)          // 我方母巢
    let allGroupCreeps = []
    for (let i = 0; i < myCreeps.length; i += groupNums) {
        let groupCreeps = myCreeps.slice(i, i + groupNums)
        allGroupCreeps.push(groupCreeps)
    }

    for (let groupCreeps of allGroupCreeps){
        let leader = groupCreeps[0]
        let closestEnemy = leader.findClosestByRange(enemyCreeps)

        let spawningCreepId = getSpawingCreepId(mySpawn)
        // 不存在敌方单位 或 当前找到最近的敌方士兵在生产中
        if (!closestEnemy || getSpawingCreepId(enemySpawn) === closestEnemy.id) {
            closestEnemy = enemySpawn
        }

        // let coordinatePath = searchPath(leader, closestEnemy).path
        let enemyAroundMySpawn = searchPath(mySpawn, closestEnemy).path.length < 20

        // 集合完毕, 索敌出发 
        if (groupCreeps.length === groupNums && groupCreeps[groupCreeps.length - 1].id !== spawningCreepId ) {
            findEnemyAndAttack(leader, closestEnemy)
        // 集合人数未齐
        } else {
            // 距离20范围外, 到指定地点等待其他士兵.
            if (!enemyAroundMySpawn){
                leader.moveTo({x: mySpawn.x, y: mySpawn.y + 5});
            } else {
                findEnemyAndAttack(leader, closestEnemy)
            }
        }

        // 领头攻击范围没有士兵, 则向敌人移动, 否则则进行攻击
        for(let creep of groupCreeps.slice(1, groupCreeps.length)) {
            // 没有遭遇到敌人, 跟随领头士兵, 
            if (!enemyAroundMySpawn){
                creep.moveTo(leader)
            } else {
                findEnemyAndAttack(creep, closestEnemy)
            }
        }
    }
}


/** 所有的士兵出生就寻找敌人并战斗
 * @param {Creep[]} myCreeps
 * @param {Creep | StructureSpawn} enemy
 */
function allCreepsAttackImmediately(myCreeps, enemy){
    for(let creep of myCreeps) {
        findEnemyAndAttack(creep, enemy)
    }
}


/** 士兵寻找敌人并进行战斗
 * @param {Creep} creep
 * @param {StructureSpawn | Creep} enemy
 * @param {boolean} wait  // 若为真, 则不向敌方士兵靠近, 仅原地进行进攻
 */
function findEnemyAndAttack(creep, enemy, wait=false){
    let enemySpotted = false
    if (creep.body.some(bodyPart => bodyPart.type === ATTACK)) {
        enemySpotted = creep.attack(enemy) === OK
    } else if (creep.body.some(bodyPart => bodyPart.type === RANGED_ATTACK)){
        enemySpotted = creep.rangedAttack(enemy) === OK
    }
    if (!enemySpotted && !wait){
        creep.moveTo(enemy);
    }
    return enemySpotted
}


/** 拥有进攻能力的士兵分组的进攻统一控制区
 * @param {Creep[]} myFighterCreeps
 * @param {Creep[]} enemyCreeps
 * @param {StructureSpawn[]} enemySpawns
 */
export function creepsAttackControl(myFighterCreeps, enemyCreeps, enemySpawns){
    if (myFighterCreeps.length === 0) {
        return
    }
    let enemySpawn = enemySpawns[0]

    // combatStrategyOne(myFighterCreeps, enemyCreeps, enemySpawn)
    combatStrategyTwo(myFighterCreeps, enemyCreeps, enemySpawn, 6)
}


/** 矿兵排队传递式向母巢转移资源
 * @param {StructureSpawn} mySpawn
 * @param {StructureContainer} closestContainer
 * @param {Creep[]} minerCreeps
 * @param {import('game/prototypes').Position[]} coordinatePath
 */
function creepsTransferMining(mySpawn, closestContainer, minerCreeps, coordinatePath){
    coordinatePath = coordinatePath.slice(0, coordinatePath.length - 1)
    coordinatePath.reverse()

    for (let i = 0; i < coordinatePath.length; i++){
        let creep = minerCreeps[i]
        let position = coordinatePath[i]
        creep.moveTo(position);
        if (i === 0){
            // 获取矿产
            creep.withdraw(closestContainer, RESOURCE_ENERGY)
        } 
        if (i < coordinatePath.length - 1){
            creep.transfer(minerCreeps[i + 1], RESOURCE_ENERGY)
        } else {
            creep.transfer(mySpawn, RESOURCE_ENERGY)
        }
    }
}


/** 每个矿兵自己规划路线进行挖矿并传送至母巢
 * @param {StructureSpawn} mySpawn
 * @param {Creep[]} minerCreeps
 * @param {StructureContainer} closestContainer
 */
function creepsSingleMining(mySpawn, minerCreeps, closestContainer){
    for(let creep of minerCreeps) {
        if(!creep.store[RESOURCE_ENERGY]) {
            if(creep.withdraw(closestContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closestContainer);
            }
        } else {
            if(creep.transfer(mySpawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.moveTo(mySpawn);
            }
        }
    }
}

/** 进行挖矿, 将能量传送给母巢
 * @param {StructureSpawn[]} mySpawns
 * @param {StructureContainer[]} containers
 * @param {Creep[]} minerCreeps
 */
export function creepsMiningControl(mySpawns, containers, minerCreeps){
    let mySpawn = mySpawns[0]
    if (minerCreeps.length === 0){
        return
    }

    let closestContainer = findClosestByRange(mySpawn, containers);
    // 计算母巢到最近的矿源的距离, 获取的点集中, 最后一个点为目的地的点.
    let coordinatePath = searchPath(mySpawn, closestContainer).path
    // 旷工数量小于母巢到矿源的距离时, 各自进行矿源运输.
    if (minerCreeps.length < coordinatePath.length - 1){
        creepsSingleMining(mySpawn, minerCreeps, closestContainer)
    } 
    // 否则按照母巢到矿源的最短路径进行排队
    else {
        creepsTransferMining(mySpawn, closestContainer, minerCreeps, coordinatePath)
    }
}
