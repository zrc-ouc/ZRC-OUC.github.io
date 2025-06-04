// 游戏状态对象 - 存储游戏的核心数据
const gameState = {
    player: {
        level: 1,
        exp: 0,
        gold: 100,
        summonStones: 50,
        tickets: 20,
        oxygen: 100,
        shells: 500,
        dungeonLevel: 1
    },
    dungeon: {
        level: 1,
        currentNode: null,
        nodes: [],
        paths: [],
        oxygen: 100,
        shells: 0,
        map: [],
        visited: []
    },
    units: {
        available: [],
        reserve: [null, null, null, null, null, null],
        battle: [],
        battleField: new Array(48).fill(null), // 8x6 grid for battle
        cage: null, // Unit in the cage
        available: [], // 可选择的单位
        reserve: [null, null, null, null, null, null], // 备战区单位
        battleField: [] // 战场上的单位
    },
    battle: {
        isActive: false,
        enemyCount: 0,
        cageType: 'normal', // 'normal' or 'elite'
        dungeonLevel: 1
    },
    traps: {
        scarecrow: {
            unlocked: false,
            level: 0,
            lastPosition: -1, // 记录上一次放置的位置
            advancedSkills: {
                damageRedirection: false, // 伤害重定向技能
                regeneration: false,      // 回血技能
                resurrection: false       // 复活技能
            }
        },
        barrel: {
            unlocked: false,
            level: 0,
            lastPosition: -1, // 记录上一次放置的位置
            advancedSkills: {
                stunExplosion: false,      // 眩晕爆炸技能
                autoCharge: false,         // 自动蓄力技能
                shockwave: false           // 冲击波技能
            }
        },
        crossbow: {
            unlocked: false,
            level: 0,
            lastPosition: -1, // 记录上一次放置的位置
            advancedSkills: {
                piercingArrow: false,      // 贯穿箭技能
                killBoost: false,          // 击杀增益技能
                attackTransfer: false      // 攻击力转移技能
            }
        },
        piggyBank: {
            unlocked: false,
            level: 0,
            savedKillCount: 0, // 保存的击杀计数
            lastPosition: -1, // 记录上一次放置的位置
            advancedSkills: {
                columnCounter: false, // 列计数技能
                healthBoost: false, // 血量提升技能
                manaBoost: false // 蓝量提升技能
            }
        },
        holyFlag: {
            unlocked: false,
            level: 0,
            lastPosition: -1 // 记录上一次放置的位置
        }
    },
    shop: {
        units: [],
        traps: {}, // 用于存储当前商店中机关的购买状态
        refreshCost: 1 // 当前刷新商店的费用
    },
    currentScreen: 'home',
    // 羁绊系统状态
    synergy: {
        player: {
            active: false,
            types: [],
            mageTypes: [],
            mageSynergyActive: false,
            rangedTypes: [],
            rangedSynergyActive: false,
            assassinTypes: [],
            assassinSynergyActive: false,
            supportTypes: [],
            supportSynergyActive: false
        },
        enemy: {
            active: false,
            types: [],
            mageTypes: [],
            mageSynergyActive: false,
            rangedTypes: [],
            rangedSynergyActive: false,
            assassinTypes: [],
            assassinSynergyActive: false,
            supportTypes: [],
            supportSynergyActive: false
        }
    },
    gameMode: 'endless', // 游戏模式：endless, story, challenge
    resources: {
        gold: 1000,
        summonStones: 50,
        tickets: 5,
        level: 1,
        exp: 0,
        expToNextLevel: 100
    },
    // 已解锁的伙伴
    unlockedPartners: {
        // 默认只解锁几个基本伙伴
        fire: true,
        water: true,
        electric: false,
        earth: false,
        grass: false,
        fireGunner: false,
        fireMage: false,
        fireSpear: false,
        waterDiver: false,
        waterMage: false,
        frostMage: false,
        electricThor: false,
        electricFlash: false,
        electricWizard: false,
        electricThunder: false,
        earthGuardian: false,
        earthPup: false,
        lavaGuardian: false,
        grassBiochemist: false,
        grassNun: false,
        lotusNymph: false,
        holyWarrior: false,
        darkQueen: false,
        motherOfLife: false
    }
};

// 初始化游戏
document.addEventListener('DOMContentLoaded', function() {
    // 同步unitTypes中的inPool值与解锁状态
    syncUnitTypesWithUnlockedPartners();
    
    // 更新资源显示
    updateResourceDisplay();
    
    // 初始化酒馆系统
    if (window.initTavernSystem) {
        window.initTavernSystem();
    }
});

// 同步unitTypes中的inPool值与解锁状态
function syncUnitTypesWithUnlockedPartners() {
    // 遍历所有伙伴
    for (const partnerId in gameState.unlockedPartners) {
        if (gameState.unlockedPartners.hasOwnProperty(partnerId) && unitTypes[partnerId]) {
            // 设置inPool值与解锁状态一致
            unitTypes[partnerId].inPool = gameState.unlockedPartners[partnerId] ? 1 : 0;
        }
    }
    console.log("同步unitTypes与解锁状态完成");
}

// 更新资源显示
function updateResourceDisplay() {
    document.getElementById('level-display').textContent = `Lv.${gameState.resources.level}`;
    document.getElementById('gold-display').textContent = gameState.resources.gold;
    document.getElementById('summon-stones-display').textContent = gameState.resources.summonStones;
    document.getElementById('tickets-display').textContent = gameState.resources.tickets;
    
    // 更新经验条
    const expPercentage = (gameState.resources.exp / gameState.resources.expToNextLevel) * 100;
    document.getElementById('exp-fill').style.width = `${expPercentage}%`;
}