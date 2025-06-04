// 商店系统模块
function showDungeonShop() {
    // 显示商店界面
    showScreen('dungeon-shop');
    
    // 重置商店机关购买状态
    gameState.shop.traps = {};
    
    // 重置刷新费用为1
    gameState.shop.refreshCost = 1;
    
    // 初始化商店单位
    generateShopUnits();
    
    // 初始化战斗区和备战区
    initShopBattleGrid();
    initShopReserveArea();
    
    // 初始化机关购买/升级区域
    initTrapButtons();
    
    // 创建刷新按钮
    createRefreshButton();
    
    // 设置下一层地牢按钮事件
    document.getElementById('next-dungeon-button').onclick = goToNextDungeonLevel;
}

// 创建刷新按钮
function createRefreshButton() {
    // 检查是否已存在刷新按钮，如果存在则移除
    const existingButton = document.getElementById('refresh-shop-button');
    if (existingButton) {
        existingButton.remove();
    }
    
    // 创建刷新按钮
    const refreshButton = document.createElement('button');
    refreshButton.id = 'refresh-shop-button';
    refreshButton.textContent = `刷新 (${gameState.shop.refreshCost}贝壳)`;
    refreshButton.style.position = 'fixed';
    refreshButton.style.bottom = '80px';
    refreshButton.style.right = '50% - 20px';
    refreshButton.style.transform = 'translateX(100px)';
    refreshButton.style.width = '120px';
    refreshButton.style.height = '40px';
    refreshButton.style.backgroundColor = '#4FC3F7';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '5px';
    refreshButton.style.color = 'white';
    refreshButton.style.fontSize = '16px';
    refreshButton.style.cursor = 'pointer';
    refreshButton.style.zIndex = '25';
    
    // 添加点击事件
    refreshButton.onclick = refreshShop;
    
    // 添加到商店界面
    document.getElementById('dungeon-shop').appendChild(refreshButton);
}

// 刷新商店
function refreshShop() {
    // 检查贝壳是否足够
    if (gameState.player.shells < gameState.shop.refreshCost) {
        alert('贝壳不足！');
        return;
    }
    
    // 扣除贝壳
    gameState.player.shells -= gameState.shop.refreshCost;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    // 增加下一次刷新的费用
    gameState.shop.refreshCost++;
    
    // 重置商店机关购买状态
    gameState.shop.traps = {};
    
    // 重新生成商店单位
    generateShopUnits();
    
    // 重新初始化机关按钮
    initTrapButtons();
    
    // 更新刷新按钮文本
    document.getElementById('refresh-shop-button').textContent = `刷新 (${gameState.shop.refreshCost}贝壳)`;
    
    // 提示刷新成功
    alert('商店已刷新！');
}

// 初始化机关按钮
function initTrapButtons() {
    // 清空容器
    const trapContainer = document.getElementById('trap-container');
    trapContainer.innerHTML = '';
    
    // 所有可用的机关类型
    const allTrapTypes = ['scarecrow', 'barrel', 'crossbow', 'piggyBank', 'holyFlag'];
    
    // 稻草人高级技能
    const scarecrowAdvancedSkills = [
        {
            id: 'damageRedirection',
            name: '伤害重定向',
            description: '稻草人同列的我方普通单位受到伤害时，将由稻草人承担'
        },
        {
            id: 'regeneration',
            name: '自我修复',
            description: '每回合结束后，稻草人恢复1点血量'
        },
        {
            id: 'resurrection',
            name: '稻草重生',
            description: '稻草人血量为0时，3回合后满血复活'
        }
    ];
    
    // 火药桶高级技能
    const barrelAdvancedSkills = [
        {
            id: 'stunExplosion',
            name: '眩晕爆炸',
            description: '被火药桶自爆伤害但仍存活的单位，有30%概率添加"无法行动"状态，持续3回合'
        },
        {
            id: 'autoCharge',
            name: '自动蓄力',
            description: '每回合结束后，攻击力增加10%并更新数值显示，5回合后，直接自爆'
        },
        {
            id: 'shockwave',
            name: '冲击波',
            description: '被火药桶自爆伤害但仍存活的单位，会被击退到远离火药桶的方向移动一格'
        }
    ];
    
    // 连弩高级技能
    const crossbowAdvancedSkills = [
        {
            id: 'piercingArrow',
            name: '贯穿箭',
            description: '连弩每发动3次攻击，下一次攻击升级为贯穿箭，对攻击目标所在列的所有对方单位造成伤害，战斗结束后重置次数'
        },
        {
            id: 'killBoost',
            name: '狩猎之力',
            description: '连弩每击杀一个敌人，攻击力增加20%，贯穿箭同时击杀多个敌人会获得多重加成，战斗结束后重置'
        },
        {
            id: 'attackTransfer',
            name: '临终遗力',
            description: '连弩被破坏后，将其当前攻击力的50%叠加至同列随机1名存活的己方单位上'
        }
    ];
    
    // 存钱罐高级技能
    const piggyBankAdvancedSkills = [
        {
            id: 'columnCounter',
            name: '列计数',
            description: '每回合结束后，统计存钱罐同列的对方存活单位数量M，并使计数N加上M，然后判定是否满足奖励条件'
        },
        {
            id: 'healthBoost',
            name: '储蓄强化',
            description: '战斗开始时，存钱罐根据当前计数N，血量立即增加N/2'
        },
        {
            id: 'manaBoost',
            name: '魔力激发',
            description: '每次存钱罐满足奖励条件，除了奖励贝壳，还将为己方的随机1名单位增加100蓝量'
        }
    ];
    
    // 圣旗高级技能
    const holyFlagAdvancedSkills = [
        {
            id: 'namedBlade',
            name: '名刀',
            description: '圣旗存活时，其九宫格范围内的所有己方单位获得"名刀"效果，即首次受到致命伤害时，血量变为1'
        },
        {
            id: 'unityStrength',
            name: '团结之力',
            description: '战斗开始时，统计圣旗所在九宫格内的己方单位数量M，并立即为圣旗血量增加M/3'
        },
        {
            id: 'resurrectionLight',
            name: '复苏之光',
            description: '战斗开始后的每5个回合，检查圣旗所在九宫格是否存在己方阵亡的单位，若存在立即随机复活1名，恢复其初始血量20%'
        }
    ];
    
    // 获取可用的稻草人高级技能
    let availableScarecrowSkills = [];
    if (gameState.traps.scarecrow.unlocked && gameState.traps.scarecrow.level >= 3) {
        // 确保advancedSkills对象已初始化
        if (!gameState.traps.scarecrow.advancedSkills) {
            gameState.traps.scarecrow.advancedSkills = {};
        }
        availableScarecrowSkills = scarecrowAdvancedSkills.filter(skill => 
            !gameState.traps.scarecrow.advancedSkills[skill.id]
        );
    }
    
    // 获取可用的火药桶高级技能
    let availableBarrelSkills = [];
    if (gameState.traps.barrel.unlocked && gameState.traps.barrel.level >= 3) {
        // 确保advancedSkills对象已初始化
        if (!gameState.traps.barrel.advancedSkills) {
            gameState.traps.barrel.advancedSkills = {};
        }
        availableBarrelSkills = barrelAdvancedSkills.filter(skill => 
            !gameState.traps.barrel.advancedSkills[skill.id]
        );
    }
    
    // 获取可用的连弩高级技能
    let availableCrossbowSkills = [];
    if (gameState.traps.crossbow.unlocked && gameState.traps.crossbow.level >= 3) {
        // 确保advancedSkills对象已初始化
        if (!gameState.traps.crossbow.advancedSkills) {
            gameState.traps.crossbow.advancedSkills = {};
        }
        availableCrossbowSkills = crossbowAdvancedSkills.filter(skill => 
            !gameState.traps.crossbow.advancedSkills[skill.id]
        );
    }
    
    // 获取可用的存钱罐高级技能
    let availablePiggyBankSkills = [];
    if (gameState.traps.piggyBank.unlocked && gameState.traps.piggyBank.level >= 3) {
        // 确保advancedSkills对象已初始化
        if (!gameState.traps.piggyBank.advancedSkills) {
            gameState.traps.piggyBank.advancedSkills = {};
        }
        availablePiggyBankSkills = piggyBankAdvancedSkills.filter(skill => 
            !gameState.traps.piggyBank.advancedSkills[skill.id]
        );
    }
    
    // 获取可用的圣旗高级技能
    let availableHolyFlagSkills = [];
    if (gameState.traps.holyFlag.unlocked && gameState.traps.holyFlag.level >= 3) {
        // 确保advancedSkills对象已初始化
        if (!gameState.traps.holyFlag.advancedSkills) {
            gameState.traps.holyFlag.advancedSkills = {};
        }
        availableHolyFlagSkills = holyFlagAdvancedSkills.filter(skill => 
            !gameState.traps.holyFlag.advancedSkills[skill.id]
        );
    }
    
    // 过滤掉已经达到3级的机关
    const availableTrapTypes = allTrapTypes.filter(trapType => {
        return !gameState.traps[trapType].unlocked || gameState.traps[trapType].level < 3;
    });
    
    // 将高级技能添加到选择池
    const allOptions = [...availableTrapTypes];
    availableScarecrowSkills.forEach(skill => {
        allOptions.push(`scarecrow_skill_${skill.id}`);
    });
    availableBarrelSkills.forEach(skill => {
        allOptions.push(`barrel_skill_${skill.id}`);
    });
    availableCrossbowSkills.forEach(skill => {
        allOptions.push(`crossbow_skill_${skill.id}`);
    });
    availablePiggyBankSkills.forEach(skill => {
        allOptions.push(`piggyBank_skill_${skill.id}`);
    });
    availableHolyFlagSkills.forEach(skill => {
        allOptions.push(`holyFlag_skill_${skill.id}`);
    });
    
    // 随机打乱所有机关类型和高级技能，不区分已解锁和未解锁
    const shuffledOptions = shuffleArray(allOptions);
    
    // 选择前3种机关或高级技能显示
    const selectedOptions = shuffledOptions.slice(0, Math.min(3, shuffledOptions.length));
    
    // 如果shop.traps不存在，初始化它
    if (!gameState.shop.traps) {
        gameState.shop.traps = {};
    }
    
    // 初始化当前商店中的机关状态
    selectedOptions.forEach(option => {
        // 检查是否是高级技能
        if (option.startsWith('scarecrow_skill_')) {
            const skillId = option.replace('scarecrow_skill_', '');
            if (gameState.shop.traps[option] === undefined) {
                gameState.shop.traps[option] = {
                    purchased: false
                };
            }
        } else if (option.startsWith('barrel_skill_')) {
            const skillId = option.replace('barrel_skill_', '');
            if (gameState.shop.traps[option] === undefined) {
                gameState.shop.traps[option] = {
                    purchased: false
                };
            }
        } else if (option.startsWith('crossbow_skill_')) {
            const skillId = option.replace('crossbow_skill_', '');
            if (gameState.shop.traps[option] === undefined) {
                gameState.shop.traps[option] = {
                    purchased: false
                };
            }
        } else if (option.startsWith('piggyBank_skill_')) {
            const skillId = option.replace('piggyBank_skill_', '');
            if (gameState.shop.traps[option] === undefined) {
                gameState.shop.traps[option] = {
                    purchased: false
                };
            }
        } else if (option.startsWith('holyFlag_skill_')) {
            const skillId = option.replace('holyFlag_skill_', '');
            if (gameState.shop.traps[option] === undefined) {
                gameState.shop.traps[option] = {
                    purchased: false
                };
            }
        } else {
            // 普通机关
            if (gameState.shop.traps[option] === undefined) {
                gameState.shop.traps[option] = {
                    purchased: false
                };
            }
        }
    });
    
    // 检查是否没有可用选项
    if (selectedOptions.length === 0) {
        // 创建"暂无商品"提示
        const noItemsMessage = document.createElement('div');
        noItemsMessage.className = 'trap-item';
        noItemsMessage.style.textAlign = 'center';
        noItemsMessage.style.padding = '20px';
        noItemsMessage.style.color = '#888';
        noItemsMessage.textContent = '暂无商品';
        trapContainer.appendChild(noItemsMessage);
        return;
    }
    
    // 创建选中的机关按钮或高级技能按钮
    selectedOptions.forEach(option => {
        // 检查是否是稻草人高级技能
        if (option.startsWith('scarecrow_skill_')) {
            const skillId = option.replace('scarecrow_skill_', '');
            const skill = scarecrowAdvancedSkills.find(s => s.id === skillId);
            
            if (skill) {
                // 创建高级技能项容器
                const skillItem = document.createElement('div');
                skillItem.className = 'trap-item';
                skillItem.id = `scarecrow-skill-${skillId}`;
                
                // 创建技能名称
                const skillName = document.createElement('div');
                skillName.className = 'trap-name';
                skillName.textContent = `稻草人技能: ${skill.name}`;
                skillName.style.color = '#FFD700'; // 金色文本
                skillItem.appendChild(skillName);
                
                // 创建技能描述
                const skillDesc = document.createElement('div');
                skillDesc.className = 'trap-desc';
                skillDesc.textContent = skill.description;
                skillItem.appendChild(skillDesc);
                
                // 创建技能按钮
                const skillButton = document.createElement('button');
                skillButton.className = 'trap-button';
                skillButton.dataset.skillType = skillId;
                
                // 检查该技能是否已在当前商店中购买过
                if (gameState.shop.traps[option] && gameState.shop.traps[option].purchased) {
                    skillButton.textContent = '已售罄';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#888';
                } else {
                    skillButton.textContent = '购买技能 (2贝壳)';
                    
                    // 添加点击事件
                    skillButton.addEventListener('click', () => {
                        purchaseScarecrowSkill(skillId);
                    });
                }
                
                skillItem.appendChild(skillButton);
                trapContainer.appendChild(skillItem);
            }
        } 
        // 检查是否是火药桶高级技能
        else if (option.startsWith('barrel_skill_')) {
            const skillId = option.replace('barrel_skill_', '');
            const skill = barrelAdvancedSkills.find(s => s.id === skillId);
            
            if (skill) {
                // 创建高级技能项容器
                const skillItem = document.createElement('div');
                skillItem.className = 'trap-item';
                skillItem.id = `barrel-skill-${skillId}`;
                
                // 创建技能名称
                const skillName = document.createElement('div');
                skillName.className = 'trap-name';
                skillName.textContent = `火药桶技能: ${skill.name}`;
                skillName.style.color = '#FF4500'; // 橙红色文本
                skillItem.appendChild(skillName);
                
                // 创建技能描述
                const skillDesc = document.createElement('div');
                skillDesc.className = 'trap-desc';
                skillDesc.textContent = skill.description;
                skillItem.appendChild(skillDesc);
                
                // 创建技能按钮
                const skillButton = document.createElement('button');
                skillButton.className = 'trap-button';
                skillButton.dataset.skillType = skillId;
                
                // 检查该技能是否已在当前商店中购买过
                if (gameState.shop.traps[option] && gameState.shop.traps[option].purchased) {
                    skillButton.textContent = '已售罄';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#888';
                } else {
                    skillButton.textContent = '购买技能 (2贝壳)';
                    
                    // 添加点击事件
                    skillButton.addEventListener('click', () => {
                        purchaseBarrelSkill(skillId);
                    });
                }
                
                skillItem.appendChild(skillButton);
                trapContainer.appendChild(skillItem);
            }
        }
        // 检查是否是连弩高级技能
        else if (option.startsWith('crossbow_skill_')) {
            const skillId = option.replace('crossbow_skill_', '');
            const skill = crossbowAdvancedSkills.find(s => s.id === skillId);
            
            if (skill) {
                // 创建高级技能项容器
                const skillItem = document.createElement('div');
                skillItem.className = 'trap-item';
                skillItem.id = `crossbow-skill-${skillId}`;
                
                // 创建技能名称
                const skillName = document.createElement('div');
                skillName.className = 'trap-name';
                skillName.textContent = `连弩技能: ${skill.name}`;
                skillName.style.color = '#FFD700'; // 金色文本
                skillItem.appendChild(skillName);
                
                // 创建技能描述
                const skillDesc = document.createElement('div');
                skillDesc.className = 'trap-desc';
                skillDesc.textContent = skill.description;
                skillItem.appendChild(skillDesc);
                
                // 创建技能按钮
                const skillButton = document.createElement('button');
                skillButton.className = 'trap-button';
                skillButton.dataset.skillType = skillId;
                
                // 检查该技能是否已在当前商店中购买过
                if (gameState.shop.traps[option] && gameState.shop.traps[option].purchased) {
                    skillButton.textContent = '已售罄';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#888';
                } else if (gameState.traps.crossbow.advancedSkills[skillId]) {
                    // 已购买该技能
                    skillButton.textContent = '已拥有';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#4CAF50';
                } else if (!gameState.traps.crossbow.unlocked || gameState.traps.crossbow.level < 3) {
                    // 连弩未达到3级
                    skillButton.textContent = '需要连弩Lv3';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#888';
                } else {
                    // 可购买
                    skillButton.textContent = '购买 (2贝壳)';
                    skillButton.addEventListener('click', () => {
                        purchaseCrossbowSkill(skillId);
                    });
                }
                
                skillItem.appendChild(skillButton);
                trapContainer.appendChild(skillItem);
            }
        } else if (option.startsWith('piggyBank_skill_')) {
            const skillId = option.replace('piggyBank_skill_', '');
            const skill = piggyBankAdvancedSkills.find(s => s.id === skillId);
            
            if (skill) {
                // 创建高级技能项容器
                const skillItem = document.createElement('div');
                skillItem.className = 'trap-item';
                skillItem.id = `piggyBank-skill-${skillId}`;
                
                // 创建技能名称
                const skillName = document.createElement('div');
                skillName.className = 'trap-name';
                skillName.textContent = `存钱罐技能: ${skill.name}`;
                skillName.style.color = '#FFD700'; // 金色文本
                skillItem.appendChild(skillName);
                
                // 创建技能描述
                const skillDesc = document.createElement('div');
                skillDesc.className = 'trap-desc';
                skillDesc.textContent = skill.description;
                skillItem.appendChild(skillDesc);
                
                // 创建技能按钮
                const skillButton = document.createElement('button');
                skillButton.className = 'trap-button';
                skillButton.dataset.skillType = skillId;
                
                // 检查该技能是否已在当前商店中购买过
                if (gameState.shop.traps[option] && gameState.shop.traps[option].purchased) {
                    skillButton.textContent = '已售罄';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#888';
                } else if (gameState.traps.piggyBank.advancedSkills[skillId]) {
                    // 已购买该技能
                    skillButton.textContent = '已拥有';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#4CAF50';
                } else if (!gameState.traps.piggyBank.unlocked || gameState.traps.piggyBank.level < 3) {
                    // 存钱罐未达到3级
                    skillButton.textContent = '需要存钱罐Lv3';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#888';
                } else {
                    // 可购买
                    skillButton.textContent = '购买 (2贝壳)';
                    skillButton.addEventListener('click', () => {
                        purchasePiggyBankSkill(skillId);
                    });
                }
                
                skillItem.appendChild(skillButton);
                trapContainer.appendChild(skillItem);
            }
        } else if (option.startsWith('holyFlag_skill_')) {
            const skillId = option.replace('holyFlag_skill_', '');
            const skill = holyFlagAdvancedSkills.find(s => s.id === skillId);
            
            if (skill) {
                // 创建高级技能项容器
                const skillItem = document.createElement('div');
                skillItem.className = 'trap-item';
                skillItem.id = `holyFlag-skill-${skillId}`;
                
                // 创建技能名称
                const skillName = document.createElement('div');
                skillName.className = 'trap-name';
                skillName.textContent = `圣旗技能: ${skill.name}`;
                skillName.style.color = '#FFD700'; // 金色文本
                skillItem.appendChild(skillName);
                
                // 创建技能描述
                const skillDesc = document.createElement('div');
                skillDesc.className = 'trap-desc';
                skillDesc.textContent = skill.description;
                skillItem.appendChild(skillDesc);
                
                // 创建技能按钮
                const skillButton = document.createElement('button');
                skillButton.className = 'trap-button';
                skillButton.dataset.skillType = skillId;
                
                // 检查该技能是否已在当前商店中购买过
                if (gameState.shop.traps[option] && gameState.shop.traps[option].purchased) {
                    skillButton.textContent = '已售罄';
                    skillButton.disabled = true;
                    skillButton.style.backgroundColor = '#888';
                } else {
                    skillButton.textContent = '购买技能 (2贝壳)';
                    
                    // 添加点击事件
                    skillButton.addEventListener('click', () => {
                        purchaseHolyFlagSkill(skillId);
                    });
                }
                
                skillItem.appendChild(skillButton);
                trapContainer.appendChild(skillItem);
            }
        } else {
            // 普通机关
            const trapType = option;
            
            // 创建机关项容器
            const trapItem = document.createElement('div');
            trapItem.className = 'trap-item';
            trapItem.id = `${trapType}-trap`;
            
            // 获取机关基础数据
            const trapData = gameState.traps[trapType];
            const baseStats = unitTypes[trapType];
            
            // 计算当前等级的血量和攻击力
            let hp = baseStats.hp;
            let attack = baseStats.attack;
            
            // 如果已解锁，根据等级调整属性
            if (trapData.unlocked) {
                hp += (trapData.level - 1); // 每级增加1点血量
                
                // 火药桶和连弩的攻击力会随等级提升
                if (trapType === 'barrel' || trapType === 'crossbow') {
                    attack += (trapData.level - 1) * 10; // 每级增加10点攻击力
                }
            }
            
            // 创建机关名称
            const trapName = document.createElement('div');
            trapName.className = 'trap-name';
            
            // 如果机关已解锁，显示带属性的名称
            if (trapData.unlocked) {
                trapName.textContent = `${getTrapName(trapType)}Lv${trapData.level} (${hp}/${attack})`;
                trapName.style.color = '#FFFF00'; // 黄色文本
            } else {
                trapName.textContent = getTrapName(trapType);
            }
            
            trapItem.appendChild(trapName);
            
            // 创建机关描述
            const trapDesc = document.createElement('div');
            trapDesc.className = 'trap-desc';
            trapDesc.textContent = getTrapDescription(trapType);
            trapItem.appendChild(trapDesc);
            
            // 创建机关按钮
            const trapButton = document.createElement('button');
            trapButton.className = 'trap-button';
            trapButton.dataset.trapType = trapType;
            
            // 检查该机关是否已在当前商店中购买过
            if (gameState.shop.traps[trapType] && gameState.shop.traps[trapType].purchased) {
                trapButton.textContent = '已售罄';
                trapButton.disabled = true;
                trapButton.style.backgroundColor = '#888';
            } else {
                // 根据机关状态更新按钮文本
                updateTrapButtonText(trapButton, trapType);
                
                // 添加点击事件
                trapButton.addEventListener('click', () => {
                    purchaseOrUpgradeTrap(trapType);
                });
            }
            
            trapItem.appendChild(trapButton);
            trapContainer.appendChild(trapItem);
        }
    });
}

// 获取机关名称
function getTrapName(trapType) {
    const trapNames = {
        'scarecrow': '稻草人',
        'barrel': '火药桶',
        'crossbow': '连弩',
        'piggyBank': '存钱罐',
        'holyFlag': '圣旗'
    };
    return trapNames[trapType] || trapType;
}

// 获取机关简短描述
function getTrapDescription(trapType) {
    const trapDescs = {
        'scarecrow': '抵挡伤害',
        'barrel': '死亡时对敌方造成伤害',
        'crossbow': '同列友军攻击时协同攻击',
        'piggyBank': '在场时我方击杀敌人获得贝壳',
        'holyFlag': '友军受伤时立即恢复血量'
    };
    return trapDescs[trapType] || '';
}

// 随机打乱数组
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 更新机关按钮文本
function updateTrapButtonText(button, trapType) {
    const trapData = gameState.traps[trapType];
    const baseStats = unitTypes[trapType];
    
    // 计算当前等级的血量和攻击力
    let hp = baseStats.hp;
    let attack = baseStats.attack;
    
    // 如果已解锁，根据等级调整属性
    if (trapData.unlocked) {
        hp += (trapData.level - 1); // 每级增加1点血量
        
        // 火药桶和连弩的攻击力会随等级提升
        if (trapType === 'barrel' || trapType === 'crossbow') {
            attack += (trapData.level - 1) * 10; // 每级增加10点攻击力
        }
    }
    
    // 获取机关名称
    const trapName = getTrapName(trapType);
    
    if (!trapData.unlocked) {
        button.textContent = `解锁机关`;
        button.style.color = '#FFFFFF'; // 白色文本
    } else if (trapData.level >= 3) {
        // 3级机关不再显示升级选项
        button.textContent = `${trapName}已达最高等级`;
        button.disabled = true;
        button.style.backgroundColor = '#4CAF50'; // 绿色背景
        button.style.color = '#FFFFFF'; // 白色文本
    } else {
        // 显示升级按钮，并添加血量/攻击力信息
        button.textContent = `升级 ${trapName}Lv${trapData.level} (${hp}/${attack})`;
        button.style.color = '#FFFF00'; // 黄色文本
    }
}

// 购买或升级机关
function purchaseOrUpgradeTrap(trapType) {
    // 检查贝壳是否足够
    if (gameState.player.shells < 1) {
        alert('贝壳不足！');
        return;
    }
    
    const trapData = gameState.traps[trapType];
    const baseStats = unitTypes[trapType];
    
    // 检查是否已达到最高等级
    if (trapData.unlocked && trapData.level >= 3) {
        alert(`${getTrapName(trapType)}已达到最高等级！`);
        return;
    }
    
    if (!trapData.unlocked) {
        // 首次解锁
        trapData.unlocked = true;
        trapData.level = 1;
        
        // 扣除贝壳
        gameState.player.shells -= 1;
        shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
        
        alert(`${unitTypes[trapType].name}机关已解锁！`);
    } else {
        // 升级
        trapData.level++;
        
        // 扣除贝壳
        gameState.player.shells -= 1;
        shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
        
        alert(`${unitTypes[trapType].name}机关已升级到Lv${trapData.level}！`);
    }
    
    // 标记该机关在当前商店中已购买
    gameState.shop.traps[trapType] = {
        purchased: true
    };
    
    // 计算新的血量和攻击力
    let hp = baseStats.hp + (trapData.level - 1); // 每级增加1点血量
    let attack = baseStats.attack;
    
    // 火药桶和连弩的攻击力会随等级提升
    if (trapType === 'barrel' || trapType === 'crossbow') {
        attack += (trapData.level - 1) * 10; // 每级增加10点攻击力
    }
    
    // 更新机关名称显示
    const trapNameElement = document.querySelector(`#${trapType}-trap .trap-name`);
    if (trapNameElement) {
        trapNameElement.textContent = `${getTrapName(trapType)}Lv${trapData.level} (${hp}/${attack})`;
        trapNameElement.style.color = '#FFFF00'; // 黄色文本
    }
    
    // 更新按钮显示为已售罄
    const button = document.querySelector(`[data-trap-type="${trapType}"]`);
    button.textContent = '已售罄';
    button.disabled = true;
    button.style.backgroundColor = '#888';
}

// 生成商店随机单位
function generateShopUnits() {
    const shopUnitsContainer = document.getElementById('shop-units-container');
    shopUnitsContainer.innerHTML = '';
    
    // 只选择inPool值为1的单位类型
    const types = Object.keys(unitTypes).filter(type => unitTypes[type].inPool === 1);
    
    // 生成6个随机单位（1行6列）
    for (let i = 0; i < 6; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        // 随机等级 1-3
        const level = Math.floor(Math.random() * 3) + 1;
        const unit = createUnit(type, level);
        
        const unitElement = document.createElement('div');
        unitElement.className = `shop-unit unit-${type}`;
        unitElement.style.backgroundColor = unitTypes[type].color;
        
        // 添加单位属性显示
        const hpElement = document.createElement('div');
        hpElement.className = 'unit-hp';
        hpElement.innerHTML = `❤️${unit.maxHP}`;
        unitElement.appendChild(hpElement);
        
        const attackElement = document.createElement('div');
        attackElement.className = 'unit-attack';
        attackElement.innerHTML = `${unitTypes[type].icon}${unit.attack}`;
        unitElement.appendChild(attackElement);
        
        const levelElement = document.createElement('div');
        levelElement.className = 'unit-level';
        levelElement.textContent = `Lv${level}`;
        unitElement.appendChild(levelElement);
        
        // 添加购买按钮
        const priceElement = document.createElement('div');
        priceElement.className = 'shop-unit-price';
        
        // 根据等级设置价格
        let price;
        if (level === 1) price = 5;
        else if (level === 2) price = 20;
        else price = 50;
        
        priceElement.textContent = `${price}贝壳`;
        priceElement.dataset.price = price;
        priceElement.dataset.unitIndex = i;
        priceElement.dataset.purchased = 'false';
        
        // 添加购买事件
        priceElement.addEventListener('click', () => {
            purchaseUnit(i, level, type, price, priceElement);
        });
        
        unitElement.appendChild(priceElement);
        shopUnitsContainer.appendChild(unitElement);
        
        // 存储单位信息
        if (!gameState.shop) {
            gameState.shop = {
                units: []
            };
        }
        
        gameState.shop.units[i] = {
            unit: unit,
            price: price,
            purchased: false
        };
    }
}

// 购买单位
function purchaseUnit(unitIndex, level, type, price, priceElement) {
    // 检查是否已购买
    if (gameState.shop.units[unitIndex].purchased) {
        alert('该单位已被解救！');
        return;
    }
    
    // 贝壳是否足够
    if (gameState.player.shells < price) {
        alert('贝壳不足！');
        return;
    }
    
    // 扣除贝壳
    gameState.player.shells -= price;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    // 标记为已购买
    gameState.shop.units[unitIndex].purchased = true;
    priceElement.dataset.purchased = 'true';
    priceElement.textContent = '已解救';
    priceElement.style.backgroundColor = '#888';
    
    // 创建单位
    const unit = createUnit(type, level);
    
    // 尝试添加到备战区
    let addedToReserve = false;
    for (let i = 0; i < gameState.units.reserve.length; i++) {
        if (gameState.units.reserve[i] === null) {
            gameState.units.reserve[i] = unit;
            addedToReserve = true;
            break;
        }
    }
    
    // 如果备战区已满，添加到战场
    if (!addedToReserve) {
        // 寻找空的战场格子
        let addedToBattlefield = false;
        for (let i = 24; i < 48; i++) {
            if (gameState.units.battleField[i] === null) {
                gameState.units.battleField[i] = unit;
                addedToBattlefield = true;
                break;
            }
        }
        
        if (!addedToBattlefield) {
            alert('战场和备战区都已满！');
            // 返还贝壳
            gameState.player.shells += price;
            shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
            // 重置购买状态
            gameState.shop.units[unitIndex].purchased = false;
            priceElement.dataset.purchased = 'false';
            priceElement.textContent = `购买: ${price}贝壳`;
            priceElement.style.backgroundColor = '#FFD700';
            return;
        }
    }
    
    // 更新显示
    initShopBattleGrid();
    initShopReserveArea();
}

// 初始化商店战斗区
function initShopBattleGrid() {
    const shopBattleGrid = document.getElementById('shop-battle-grid');
    shopBattleGrid.innerHTML = '';
    
    // 创建4x6网格（只显示玩家区域）
    for (let row = 4; row < 8; row++) {
        for (let col = 0; col < 6; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell player-area';
            cell.dataset.index = row * 6 + col;
            
            // 设置拖放事件
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            
            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                const unitData = JSON.parse(e.dataTransfer.getData('application/json'));
                const sourceType = unitData.sourceType;
                const sourceIndex = unitData.sourceIndex;
                const targetIndex = parseInt(cell.dataset.index);
                
                // 检查是否拖回原位置
                if (sourceType === 'battlefield' && sourceIndex === targetIndex) {
                    return;
                }
                
                // 只允许在玩家区域放置
                if (targetIndex >= 24) {
                    const targetUnit = gameState.units.battleField[targetIndex];
                    let sourceUnit;
                    
                    sourceUnit = sourceType === 'battlefield' ? 
                        gameState.units.battleField[sourceIndex] : 
                        gameState.units.reserve[sourceIndex];
                    
                    if (targetUnit && sourceUnit && targetUnit.type === sourceUnit.type && 
                        ((targetUnit.level === sourceUnit.level && targetUnit.level < 3) || 
                        (targetUnit.level + sourceUnit.level === 3))) {
                        // 使用全局合并单位辅助函数进行升级
                        mergeUnits(targetUnit, sourceUnit);
                        
                        if (sourceType === 'battlefield') {
                            gameState.units.battleField[sourceIndex] = null;
                        } else {
                            gameState.units.reserve[sourceIndex] = null;
                        }
                    } else if (!targetUnit && sourceUnit) {
                        // 移动到空格子
                        moveUnitToShopBattlefield(sourceType, sourceIndex, targetIndex);
                    }
                    initShopBattleGrid();
                    initShopReserveArea();
                }
            });
            
            // 使战场单位可拖拽
            cell.addEventListener('dragstart', (e) => {
                const index = parseInt(cell.dataset.index);
                if (gameState.units.battleField[index]) {
                    const data = {
                        sourceType: 'battlefield',
                        sourceIndex: index
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(data));
                }
            });
            cell.draggable = true;
            
            // 如果该位置有单位，显示单位
            const unitIndex = row * 6 + col;
            if (gameState.units.battleField[unitIndex]) {
                const unit = gameState.units.battleField[unitIndex];
                cell.style.backgroundColor = unitTypes[unit.type].color;
                
                const hpElement = document.createElement('div');
                hpElement.className = 'unit-hp';
                hpElement.innerHTML = `❤️${Math.round(unit.currentHP)}`;
                cell.appendChild(hpElement);
                
                const attackElement = document.createElement('div');
                attackElement.className = 'unit-attack';
                attackElement.innerHTML = `${unitTypes[unit.type].icon}${unit.attack}`;
                cell.appendChild(attackElement);
                
                const levelElement = document.createElement('div');
                levelElement.className = 'unit-level';
                levelElement.textContent = `Lv${unit.level}`;
                cell.appendChild(levelElement);
            }
            
            shopBattleGrid.appendChild(cell);
        }
    }
}

// 初始化商店备战区
function initShopReserveArea() {
    const shopReserveArea = document.getElementById('shop-reserve-area');
    shopReserveArea.innerHTML = '';
    
    // 创建备战区槽位
    for (let i = 0; i < 6; i++) {
        const slot = document.createElement('div');
        slot.className = 'reserve-slot';
        slot.dataset.index = i;
        
        // 添加拖放事件
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            const unitData = JSON.parse(e.dataTransfer.getData('application/json'));
            const sourceType = unitData.sourceType;
            const sourceIndex = unitData.sourceIndex;
            const targetIndex = i;
            
            // 检查是否拖回原位置
            if (sourceType === 'reserve' && sourceIndex === targetIndex) {
                return;
            }
            
            let sourceUnit = sourceType === 'battlefield' ? 
                gameState.units.battleField[sourceIndex] : 
                gameState.units.reserve[sourceIndex];
            
            const targetUnit = gameState.units.reserve[targetIndex];
            
            if (targetUnit && sourceUnit && targetUnit.type === sourceUnit.type && 
                ((targetUnit.level === sourceUnit.level && targetUnit.level < 3) || 
                (targetUnit.level + sourceUnit.level === 3))) {
                // 合并升级
                targetUnit.level = Math.min(targetUnit.level + sourceUnit.level, 3);
                // 更新单位属性
                const baseStats = unitTypes[targetUnit.type];
                const levelMultiplier = targetUnit.level === 1 ? 1 : targetUnit.level === 2 ? 2 : 4;
                targetUnit.maxHP = baseStats.hp * levelMultiplier;
                targetUnit.currentHP = targetUnit.maxHP;
                targetUnit.attack = baseStats.attack * levelMultiplier;
                if (sourceType === 'battlefield') {
                    gameState.units.battleField[sourceIndex] = null;
                } else {
                    gameState.units.reserve[sourceIndex] = null;
                }
            } else if (!targetUnit && sourceUnit) {
                // 移动到空格子
                gameState.units.reserve[targetIndex] = sourceUnit;
                if (sourceType === 'battlefield') {
                    gameState.units.battleField[sourceIndex] = null;
                } else {
                    gameState.units.reserve[sourceIndex] = null;
                }
            }
            
            initShopBattleGrid();
            initShopReserveArea();
        });
        
        // 如果该位置有单位，显示单位
        if (gameState.units.reserve[i]) {
            const unit = gameState.units.reserve[i];
            slot.style.backgroundColor = unitTypes[unit.type].color;
            
            const hpElement = document.createElement('div');
            hpElement.className = 'unit-hp';
            hpElement.innerHTML = `❤️${Math.round(unit.currentHP)}`;
            slot.appendChild(hpElement);
            
            const attackElement = document.createElement('div');
            attackElement.className = 'unit-attack';
            attackElement.innerHTML = `${unitTypes[unit.type].icon}${unit.attack}`;
            slot.appendChild(attackElement);
            
            const levelElement = document.createElement('div');
            levelElement.className = 'unit-level';
            levelElement.textContent = `Lv${unit.level}`;
            slot.appendChild(levelElement);
            
            // 使单位可拖拽
            slot.draggable = true;
            slot.addEventListener('dragstart', (e) => {
                const data = {
                    sourceType: 'reserve',
                    sourceIndex: i
                };
                e.dataTransfer.setData('application/json', JSON.stringify(data));
            });
            
        } else {
            slot.style.backgroundColor = '#666';
        }
        
        shopReserveArea.appendChild(slot);
    }
}

// 移动单位到商店战场
function moveUnitToShopBattlefield(sourceType, sourceIndex, targetIndex) {
    let unit;
    
    if (sourceType === 'reserve') {
        unit = gameState.units.reserve[sourceIndex];
        if (unit) {
            // 从备战区移动到战场
            gameState.units.battleField[targetIndex] = unit;
            gameState.units.reserve[sourceIndex] = null;
        }
    } else if (sourceType === 'battlefield') {
        unit = gameState.units.battleField[sourceIndex];
        if (unit) {
            // 在战场内移动
            gameState.units.battleField[targetIndex] = unit;
            gameState.units.battleField[sourceIndex] = null;
        }
    }
    
    // 更新显示
    initShopBattleGrid();
    initShopReserveArea();
}

function goToNextDungeonLevel() {
    // 备份单位信息
    backupUnitInfo();
    
    // 增加地牢层数
    gameState.dungeon.level += 1;
    
    // 重新生成地牢地图
    showScreen('dungeon-map');
    generateDungeonMap();
    
    // 更新氧气显示
    oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
}

// 购买稻草人高级技能
function purchaseScarecrowSkill(skillId) {
    // 检查贝壳是否足够
    if (gameState.player.shells < 2) {
        alert('贝壳不足！');
        return;
    }
    
    // 检查稻草人是否已解锁且达到3级
    if (!gameState.traps.scarecrow.unlocked || gameState.traps.scarecrow.level < 3) {
        alert('需要先将稻草人升级到3级！');
        return;
    }
    
    // 确保advancedSkills对象已初始化
    if (!gameState.traps.scarecrow.advancedSkills) {
        gameState.traps.scarecrow.advancedSkills = {};
    }
    
    // 检查技能是否已购买
    if (gameState.traps.scarecrow.advancedSkills[skillId]) {
        alert('该技能已购买！');
        return;
    }
    
    // 扣除贝壳
    gameState.player.shells -= 2;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    // 解锁技能
    gameState.traps.scarecrow.advancedSkills[skillId] = true;
    
    // 获取技能名称
    let skillName = '';
    if (skillId === 'damageRedirection') {
        skillName = '伤害重定向';
    } else if (skillId === 'regeneration') {
        skillName = '自我修复';
    } else if (skillId === 'resurrection') {
        skillName = '稻草重生';
    }
    
    // 标记该技能在当前商店中已购买
    gameState.shop.traps[`scarecrow_skill_${skillId}`] = {
        purchased: true
    };
    
    // 更新按钮显示为已售罄
    const button = document.querySelector(`[data-skill-type="${skillId}"]`);
    if (button) {
        button.textContent = '已售罄';
        button.disabled = true;
        button.style.backgroundColor = '#888';
    }
    
    alert(`稻草人技能"${skillName}"已购买！`);
}

// 购买火药桶高级技能
function purchaseBarrelSkill(skillId) {
    // 检查贝壳是否足够
    if (gameState.player.shells < 2) {
        alert('贝壳不足！');
        return;
    }
    
    // 检查火药桶是否已解锁且达到3级
    if (!gameState.traps.barrel.unlocked || gameState.traps.barrel.level < 3) {
        alert('需要先将火药桶升级到3级！');
        return;
    }
    
    // 确保advancedSkills对象已初始化
    if (!gameState.traps.barrel.advancedSkills) {
        gameState.traps.barrel.advancedSkills = {};
    }
    
    // 检查技能是否已购买
    if (gameState.traps.barrel.advancedSkills[skillId]) {
        alert('该技能已购买！');
        return;
    }
    
    // 扣除贝壳
    gameState.player.shells -= 2;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    // 解锁技能
    gameState.traps.barrel.advancedSkills[skillId] = true;
    
    // 获取技能名称
    let skillName = '';
    if (skillId === 'stunExplosion') {
        skillName = '眩晕爆炸';
    }
    
    // 标记该技能在当前商店中已购买
    gameState.shop.traps[`barrel_skill_${skillId}`] = {
        purchased: true
    };
    
    // 更新按钮显示为已售罄
    const button = document.querySelector(`[data-skill-type="${skillId}"]`);
    if (button) {
        button.textContent = '已售罄';
        button.disabled = true;
        button.style.backgroundColor = '#888';
    }
    
    alert(`火药桶技能"${skillName}"已购买！`);
}

// 购买连弩高级技能
function purchaseCrossbowSkill(skillId) {
    // 检查贝壳是否足够
    if (gameState.player.shells < 2) {
        alert('贝壳不足！');
        return;
    }
    
    // 检查连弩是否已解锁且达到3级
    if (!gameState.traps.crossbow.unlocked || gameState.traps.crossbow.level < 3) {
        alert('需要先将连弩升级到3级！');
        return;
    }
    
    // 确保advancedSkills对象已初始化
    if (!gameState.traps.crossbow.advancedSkills) {
        gameState.traps.crossbow.advancedSkills = {};
    }
    
    // 检查技能是否已购买
    if (gameState.traps.crossbow.advancedSkills[skillId]) {
        alert('该技能已购买！');
        return;
    }
    
    // 扣除贝壳
    gameState.player.shells -= 2;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    // 解锁技能
    gameState.traps.crossbow.advancedSkills[skillId] = true;
    
    // 获取技能名称
    let skillName = '';
    if (skillId === 'piercingArrow') {
        skillName = '贯穿箭';
    } else if (skillId === 'killBoost') {
        skillName = '狩猎之力';
    } else if (skillId === 'attackTransfer') {
        skillName = '临终遗力';
    }
    
    // 标记该技能在当前商店中已购买
    gameState.shop.traps[`crossbow_skill_${skillId}`] = {
        purchased: true
    };
    
    // 更新按钮显示为已售罄
    const button = document.querySelector(`[data-skill-type="${skillId}"]`);
    if (button) {
        button.textContent = '已售罄';
        button.disabled = true;
        button.style.backgroundColor = '#888';
    }
    
    alert(`连弩技能"${skillName}"已购买！`);
}

// 购买存钱罐高级技能
function purchasePiggyBankSkill(skillId) {
    // 检查贝壳是否足够
    if (gameState.player.shells < 2) {
        alert('贝壳不足！');
        return;
    }
    
    // 检查存钱罐是否已解锁且达到3级
    if (!gameState.traps.piggyBank.unlocked || gameState.traps.piggyBank.level < 3) {
        alert('需要先将存钱罐升级到3级！');
        return;
    }
    
    // 确保advancedSkills对象已初始化
    if (!gameState.traps.piggyBank.advancedSkills) {
        gameState.traps.piggyBank.advancedSkills = {};
    }
    
    // 检查技能是否已购买
    if (gameState.traps.piggyBank.advancedSkills[skillId]) {
        alert('该技能已购买！');
        return;
    }
    
    // 扣除贝壳
    gameState.player.shells -= 2;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    // 解锁技能
    gameState.traps.piggyBank.advancedSkills[skillId] = true;
    
    // 获取技能名称
    let skillName = '';
    if (skillId === 'columnCounter') {
        skillName = '列计数';
    } else if (skillId === 'healthBoost') {
        skillName = '储蓄强化';
    } else if (skillId === 'manaBoost') {
        skillName = '魔力激发';
    }
    
    // 标记该技能在当前商店中已购买
    gameState.shop.traps[`piggyBank_skill_${skillId}`] = {
        purchased: true
    };
    
    // 更新按钮显示为已售罄
    const button = document.querySelector(`[data-skill-type="${skillId}"]`);
    if (button) {
        button.textContent = '已售罄';
        button.disabled = true;
        button.style.backgroundColor = '#888';
    }
    
    alert(`存钱罐技能"${skillName}"已购买！`);
}

// 购买圣旗高级技能
function purchaseHolyFlagSkill(skillId) {
    // 检查贝壳是否足够
    if (gameState.player.shells < 2) {
        alert('贝壳不足！');
        return;
    }
    
    // 检查圣旗是否已解锁且达到3级
    if (!gameState.traps.holyFlag.unlocked || gameState.traps.holyFlag.level < 3) {
        alert('需要先将圣旗升级到3级！');
        return;
    }
    
    // 确保advancedSkills对象已初始化
    if (!gameState.traps.holyFlag.advancedSkills) {
        gameState.traps.holyFlag.advancedSkills = {};
    }
    
    // 检查技能是否已购买
    if (gameState.traps.holyFlag.advancedSkills[skillId]) {
        alert('该技能已购买！');
        return;
    }
    
    // 扣除贝壳
    gameState.player.shells -= 2;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    // 解锁技能
    gameState.traps.holyFlag.advancedSkills[skillId] = true;
    
    // 获取技能名称
    let skillName = '';
    if (skillId === 'namedBlade') {
        skillName = '名刀';
    } else if (skillId === 'unityStrength') {
        skillName = '团结之力';
    } else if (skillId === 'resurrectionLight') {
        skillName = '复苏之光';
    }
    
    // 标记该技能在当前商店中已购买
    gameState.shop.traps[`holyFlag_skill_${skillId}`] = {
        purchased: true
    };
    
    // 更新按钮显示为已售罄
    const button = document.querySelector(`[data-skill-type="${skillId}"]`);
    if (button) {
        button.textContent = '已售罄';
        button.disabled = true;
        button.style.backgroundColor = '#888';
    }
    
    alert(`圣旗技能"${skillName}"已购买！`);
}