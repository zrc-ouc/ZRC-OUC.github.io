// 酒馆系统 - 抽奖功能

// 定义可抽取的伙伴池
const summonPool = {
    // 普通伙伴池（3星）
    common: [
        { id: 'fire', name: '拳击手', element: 'fire', icon: '👊', rarity: 3 },
        { id: 'fireGunner', name: '火枪手', element: 'fire', icon: '🔫', rarity: 3 },
        { id: 'fireMage', name: '火焰法师', element: 'fire', icon: '🔮', rarity: 3 },
        { id: 'water', name: '消防员', element: 'water', icon: '💧', rarity: 3 },
        { id: 'waterDiver', name: '潜水员', element: 'water', icon: '🤿', rarity: 3 },
        { id: 'waterMage', name: '水魔法师', element: 'water', icon: '🌊', rarity: 3 },
        { id: 'electricThor', name: '雷神', element: 'electric', icon: '🔨', rarity: 3 },
        { id: 'electricFlash', name: '雷电刺客', element: 'electric', icon: '⚡', rarity: 3 },
        { id: 'electricWizard', name: '雷电术士', element: 'electric', icon: '🌩️', rarity: 3 },
        { id: 'earthGuardian', name: '守护者', element: 'earth', icon: '🗿', rarity: 3 },
        { id: 'earth', name: '盗贼', element: 'earth', icon: '⛏️', rarity: 3 },
        { id: 'earthPup', name: '傀儡师', element: 'earth', icon: '🎭', rarity: 3 },
        { id: 'grassBiochemist', name: '生化员', element: 'grass', icon: '🧪', rarity: 3 },
        { id: 'grass', name: '花仙子', element: 'grass', icon: '🌿', rarity: 3 },
        { id: 'grassNun', name: '修女', element: 'grass', icon: '✝️', rarity: 3 }
    ],
    
    // 稀有伙伴池（4星）
    rare: [
        { id: 'fireSpear', name: '红缨枪', element: 'fire', icon: '⚔️', rarity: 4 },
        { id: 'frostMage', name: '冰霜术士', element: 'water', icon: '❄️', rarity: 4 },
        { id: 'electricThunder', name: '雷霆射手', element: 'electric', icon: '🏹', rarity: 4 },
        { id: 'lavaGuardian', name: '熔岩守护者', element: 'earth', icon: '🌋', rarity: 4 },
        { id: 'lotusNymph', name: '莲花仙女', element: 'grass', icon: '🌺', rarity: 4 }
    ],
    
    // 传说伙伴池（5星）
    legendary: [
        { id: 'holyWarrior', name: '圣战士', element: 'special', icon: '✝️', rarity: 5 },
        { id: 'darkQueen', name: '暗夜女王', element: 'special', icon: '👑', rarity: 5 },
        { id: 'motherOfLife', name: '生命之母', element: 'special', icon: '🌱', rarity: 5 }
    ]
};

// 抽奖概率设置
const summonRates = {
    gold: {
        common: 0.80,    // 3星概率 80%
        rare: 0.18,      // 4星概率 18%
        legendary: 0.02  // 5星概率 2%
    },
    stone: {
        common: 0.70,    // 3星概率 70%
        rare: 0.25,      // 4星概率 25%
        legendary: 0.05  // 5星概率 5%
    }
};

// 抽奖消耗
const summonCosts = {
    gold: {
        single: 100,
        multi: 900
    },
    stone: {
        single: 1,
        multi: 9
    }
};

// 初始化酒馆系统
function initTavernSystem() {
    console.log("初始化酒馆系统");
    
    // 绑定按钮事件
    document.getElementById('gold-single-summon').addEventListener('click', () => performSummon('gold', 1));
    document.getElementById('gold-multi-summon').addEventListener('click', () => performSummon('gold', 10));
    document.getElementById('stone-single-summon').addEventListener('click', () => performSummon('stone', 1));
    document.getElementById('stone-multi-summon').addEventListener('click', () => performSummon('stone', 10));
    
    // 关闭抽奖结果弹窗
    document.getElementById('close-summon-result').addEventListener('click', closeSummonResult);
    
    console.log("酒馆系统初始化完成");
}

// 执行抽奖
function performSummon(type, count) {
    console.log(`执行${type}抽奖，数量：${count}`);
    
    // 检查资源是否足够
    let cost = type === 'gold' ? summonCosts.gold : summonCosts.stone;
    let currentResource = type === 'gold' ? gameState.resources.gold : gameState.resources.summonStones;
    let totalCost = count === 1 ? cost.single : cost.multi;
    
    console.log(`当前资源：${currentResource}，需要消耗：${totalCost}`);
    
    if (currentResource < totalCost) {
        alert(`资源不足！需要${totalCost}${type === 'gold' ? '金币' : '召唤石'}`);
        return;
    }
    
    // 扣除资源
    if (type === 'gold') {
        gameState.resources.gold -= totalCost;
        document.getElementById('gold-display').textContent = gameState.resources.gold;
    } else {
        gameState.resources.summonStones -= totalCost;
        document.getElementById('summon-stones-display').textContent = gameState.resources.summonStones;
    }
    
    // 执行抽奖
    const results = [];
    for (let i = 0; i < count; i++) {
        results.push(singleSummon(type));
    }
    
    console.log("抽奖结果：", results);
    
    // 显示抽奖结果
    showSummonResults(results);
}

// 单次抽奖
function singleSummon(type) {
    // 获取对应类型的抽奖概率
    const rates = type === 'gold' ? summonRates.gold : summonRates.stone;
    
    // 随机决定稀有度
    const rand = Math.random();
    let rarity;
    if (rand < rates.legendary) {
        rarity = 'legendary';
    } else if (rand < rates.legendary + rates.rare) {
        rarity = 'rare';
    } else {
        rarity = 'common';
    }
    
    // 从对应稀有度池中随机选择一个伙伴
    const pool = summonPool[rarity];
    const partner = pool[Math.floor(Math.random() * pool.length)];
    
    return partner;
}

// 显示抽奖结果
function showSummonResults(results) {
    console.log("显示抽奖结果");
    
    const resultContent = document.getElementById('summon-result-content');
    resultContent.innerHTML = '';
    
    // 创建每个抽到的伙伴的显示元素
    results.forEach(partner => {
        // 检查是否是新解锁的伙伴
        const isNewPartner = !gameState.unlockedPartners[partner.id];
        
        // 解锁伙伴
        if (isNewPartner) {
            gameState.unlockedPartners[partner.id] = true;
            console.log(`解锁新伙伴: ${partner.name}`);
            
            // 更新unitTypes中的inPool值
            if (unitTypes[partner.id]) {
                unitTypes[partner.id].inPool = 1;
                console.log(`设置 ${partner.id} 的inPool值为1`);
            }
        }
        
        const unitElement = document.createElement('div');
        unitElement.className = `summon-unit partner-${partner.element}`;
        
        const iconElement = document.createElement('div');
        iconElement.className = 'summon-unit-icon';
        iconElement.textContent = partner.icon;
        
        const nameElement = document.createElement('div');
        nameElement.className = 'summon-unit-name';
        nameElement.textContent = partner.name;
        
        const rarityElement = document.createElement('div');
        rarityElement.className = 'summon-unit-rarity';
        rarityElement.textContent = '★'.repeat(partner.rarity);
        
        // 如果是新解锁的伙伴，添加"新"标签
        if (isNewPartner) {
            const newTag = document.createElement('div');
            newTag.className = 'summon-unit-new';
            newTag.textContent = '新!';
            unitElement.appendChild(newTag);
        }
        
        unitElement.appendChild(iconElement);
        unitElement.appendChild(nameElement);
        unitElement.appendChild(rarityElement);
        
        resultContent.appendChild(unitElement);
    });
    
    // 显示结果弹窗
    document.getElementById('summon-result-overlay').classList.remove('hidden');
    console.log("抽奖结果弹窗已显示");
}

// 关闭抽奖结果弹窗
function closeSummonResult() {
    document.getElementById('summon-result-overlay').classList.add('hidden');
    console.log("关闭抽奖结果弹窗");
}

// 导出函数
window.initTavernSystem = initTavernSystem; 