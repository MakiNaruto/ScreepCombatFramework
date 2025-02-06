import {getObjectsByPrototype} from 'game/utils';
import {ATTACK, RANGED_ATTACK} from 'game/constants';
import {Creep, StructureSpawn, StructureContainer} from 'game/prototypes';
import {creepsAttackControl, creepsMiningControl} from './creepsAction.mjs'
import {creepsTargetTypeSelect, creepsCreateControl, recordAllCreepsId, MINER} from './creepsManager.mjs';


export function loop() {

    let mySpawns = getObjectsByPrototype(StructureSpawn).filter(spawn => spawn.my)          // 我方母巢
    let enemySpawns = getObjectsByPrototype(StructureSpawn).filter(spawn => !spawn.my)      // 敌方母巢
    
    let containers = getObjectsByPrototype(StructureContainer).filter(i => i.store.getUsedCapacity() > 0)       // 所有可开采的矿产资源

    let myCreeps = getObjectsByPrototype(Creep).filter(creep => creep.my);                  // 我的所有士兵
    let enemyCreeps = getObjectsByPrototype(Creep).filter(creep => !creep.my);              // 敌人所有士兵

    // 选择具有某种能力的兵
    let minerCreeps = creepsTargetTypeSelect(myCreeps, MINER);                              // 采矿兵
    // 拥有战斗能力的兵
    let fighterCreeps = myCreeps.filter(
                creep => creep.exists && 
                (creep.body.some(bodyPart => bodyPart.type === ATTACK) || creep.body.some(bodyPart => bodyPart.type === RANGED_ATTACK))
            )

    // 按计划创建小兵
    creepsCreateControl(mySpawns)
    // 为母巢获取能量资源
    creepsMiningControl(mySpawns, containers, minerCreeps)
    // 使小兵进攻
    creepsAttackControl(fighterCreeps, enemyCreeps, enemySpawns)

    let test = recordAllCreepsId(mySpawns)
    console.log(test)

    // TODO
    // 1. 

    // DONE
    // 1. 集合, 根据分组进行集合
    // 2. 战斗, 当分组满员, 开始群体移动和战斗
    // 3. 防御, 当敌方士兵移动至危险范围内时, 当前集合的分组群体移动和战斗.
}
    