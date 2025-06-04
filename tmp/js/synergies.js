// 检查并应用羁绊效果
function checkAndApplySynergies() {
    // 重置羁绊状态
    resetSynergies();
    
    // 确保羁绊图标已初始化
    initSynergyIcons();
    
    // 检查玩家方羁绊
    checkWarriorSynergy(24, 48, 'player');
    checkMageSynergy(24, 48, 'player');
    checkRangedSynergy(24, 48, 'player');
    checkAssassinSynergy(24, 48, 'player');
    checkSupportSynergy(24, 48, 'player');
    
    // 检查敌方羁绊
    checkWarriorSynergy(0, 24, 'enemy');
    checkMageSynergy(0, 24, 'enemy');
    checkRangedSynergy(0, 24, 'enemy');
    checkAssassinSynergy(0, 24, 'enemy');
    checkSupportSynergy(0, 24, 'enemy');
    
    // 检查属性共鸣
    checkFireResonance(24, 48, 'player');
    checkFireResonance(0, 24, 'enemy');
    checkWaterResonance(24, 48, 'player');
    checkWaterResonance(0, 24, 'enemy');
    checkGrassResonance(24, 48, 'player');
    checkGrassResonance(0, 24, 'enemy');
    checkElectricResonance(24, 48, 'player');
    checkElectricResonance(0, 24, 'enemy');
    checkEarthResonance(24, 48, 'player');
    checkEarthResonance(0, 24, 'enemy');
}

// 重置羁绊状态
function resetSynergies() {
    // 重置羁绊状态
    gameState.synergy = {
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
            supportSynergyActive: false,
            // 属性共鸣相关
            fireResonanceActive: false,
            fireTypes: [],
            waterResonanceActive: false,
            waterTypes: [],
            grassResonanceActive: false,
            grassTypes: [],
            electricResonanceActive: false,
            electricTypes: [],
            earthResonanceActive: false,
            earthTypes: []
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
            supportSynergyActive: false,
            // 属性共鸣相关
            fireResonanceActive: false,
            fireTypes: [],
            waterResonanceActive: false,
            waterTypes: [],
            grassResonanceActive: false,
            grassTypes: [],
            electricResonanceActive: false,
            electricTypes: [],
            earthResonanceActive: false,
            earthTypes: []
        }
    };

    // 重置战士羁绊效果 - 恢复原始血量
    for (let i = 0; i < gameState.units.battleField.length; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && unit.originalMaxHP) {
            // 恢复原始最大血量
            const currentRatio = unit.currentHP / unit.maxHP; // 保持当前血量百分比
            unit.maxHP = unit.originalMaxHP;
            unit.currentHP = Math.round(unit.maxHP * currentRatio);
            delete unit.originalMaxHP;
            
            // 更新单位显示
            updateUnitDisplay(i);
        }
    }
    
    // 重置所有单位的羁绊增益
    for (let i = 0; i < gameState.units.battleField.length; i++) {
        const unit = gameState.units.battleField[i];
        if (unit) {
            // 重置攻击力相关的羁绊增益
            if (gameState.synergy.player.rangedSynergyActive || gameState.synergy.enemy.rangedSynergyActive) {
                // 远程羁绊增加了20%攻击力，需要重置
                unit.attack = Math.round(unit.attack / 1.2);
            }
            
            // 重置水属性共鸣减少的攻击力
            if (unit.waterResonanceDebuff) {
                unit.attack = Math.round(unit.attack / 0.8); // 恢复被削弱的攻击力
                delete unit.waterResonanceDebuff;
            }
            
            // 重置草属性共鸣减少的回蓝量
            if (unit.grassResonanceDebuff) {
                delete unit.grassResonanceDebuff;
            }
            
            // 重置土属性共鸣减伤效果
            if (unit.earthResonanceBuff) {
                delete unit.earthResonanceBuff;
            }
            
            // 重置速度相关的羁绊增益
            if (unit.bonusSpeed) {
                delete unit.bonusSpeed;
            }
            
            // 更新单位显示
            updateUnitDisplay(i);
        }
    }
    
    // 将所有羁绊图标设置为非激活状态
    const synergyIcons = document.querySelectorAll('.synergy-icon');
    synergyIcons.forEach(icon => {
        icon.classList.remove('active');
    });
}

// 检查战士羁绊
function checkWarriorSynergy(startIndex, endIndex, side) {
    // 定义战士类型单位
    const warriorUnits = ['fire', 'electricThor', 'earthGuardian', 'lavaGuardian', 'holyWarrior', 'holyAngel'];
    
    // 收集上场的战士单位类型
    const warriorTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && warriorUnits.includes(unit.type)) {
            warriorTypes.add(unit.type);
        }
    }
    
    // 记录找到的战士类型
    gameState.synergy[side].types = Array.from(warriorTypes);
    
    // 如果至少有2种不同的战士类型，激活羁绊效果
    if (warriorTypes.size >= 2) {
        // 标记羁绊激活
        gameState.synergy[side].active = true;
        
        // 激活对应的战士羁绊图标
        const iconId = `${side}-warrior`;
        const synergyIcon = document.getElementById(iconId);
        if (synergyIcon) {
            synergyIcon.classList.add('active');
        }
        
        // 应用羁绊效果 - 增加初始血量
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit) {
                // 保存原始最大血量用于战斗结束后重置
                if (!unit.originalMaxHP) {
                    unit.originalMaxHP = unit.maxHP;
                }
                
                // 增加当前血量和最大血量
                const healthBonus = Math.round(unit.maxHP * 0.2);
                unit.maxHP += healthBonus;
                unit.currentHP += healthBonus;
                
                // 更新单位显示
                updateUnitDisplay(i);
            }
        }
    }
}

// 检查法师羁绊
function checkMageSynergy(startIndex, endIndex, side) {
    // 定义法师类型单位
    const mageUnits = ['fireMage', 'electricWizard', 'grassNun', 'frostMage', 'darkQueen'];
    
    // 收集上场的法师单位类型
    const mageTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && mageUnits.includes(unit.type)) {
            mageTypes.add(unit.type);
        }
    }
    
    // 记录找到的法师类型
    gameState.synergy[side].mageTypes = Array.from(mageTypes);
    
    // 如果至少有3种不同的法师类型，激活羁绊效果
    if (mageTypes.size >= 3) {
        // 标记羁绊激活
        gameState.synergy[side].mageSynergyActive = true;
        
        // 激活对应的法师羁绊图标
        const iconId = `${side}-mage`;
        const synergyIcon = document.getElementById(iconId);
        if (synergyIcon) {
            synergyIcon.classList.add('active');
        }
        
        // 应用羁绊效果 - 增加初始蓝量
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit) {
                // 设置初始蓝量为100
                const originalMana = unit.mana;
                unit.mana = 100;
                
                // 更新单位显示
                updateUnitDisplay(i);
                
                // 显示增益效果（如果蓝量有增加）
                if (unit.mana > originalMana) {
                    const manaBonus = unit.mana - originalMana;
                    const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                    if (unitCell) {
                        const buffText = createDamageNumber(`+${manaBonus}🔵`, '#4FC3F7');
                        unitCell.appendChild(buffText);
                        setTimeout(() => {
                            if (unitCell.contains(buffText)) {
                                unitCell.removeChild(buffText);
                            }
                        }, 1500);
                    }
                }
            }
        }
    }
}

// 检查远程羁绊
function checkRangedSynergy(startIndex, endIndex, side) {
    // 定义远程类型单位
    const rangedUnits = ['fireGunner', 'water', 'grassBiochemist', 'electricThunder', 'holyWarrior', 'holyAngel'];
    
    // 收集上场的远程单位类型
    const rangedTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && rangedUnits.includes(unit.type)) {
            rangedTypes.add(unit.type);
        }
    }
    
    // 记录找到的远程类型
    gameState.synergy[side].rangedTypes = Array.from(rangedTypes);
    
    // 如果至少有3种不同的远程类型，激活羁绊效果
    if (rangedTypes.size >= 3) {
        // 标记羁绊激活
        gameState.synergy[side].rangedSynergyActive = true;
        
        // 激活对应的远程羁绊图标
        const iconId = `${side}-ranged`;
        const synergyIcon = document.getElementById(iconId);
        if (synergyIcon) {
            synergyIcon.classList.add('active');
        }
        
        // 应用羁绊效果 - 增加攻击力
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit) {
                // 增加攻击力20%
                const attackBonus = Math.round(unit.attack * 0.2);
                unit.attack += attackBonus;
                
                // 更新单位显示
                updateUnitDisplay(i);
                
                // 显示增益效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (unitCell) {
                    const buffText = createDamageNumber(`+${attackBonus}⚔️`, '#FFA500');
                    unitCell.appendChild(buffText);
                    setTimeout(() => {
                        if (unitCell.contains(buffText)) {
                            unitCell.removeChild(buffText);
                        }
                    }, 1500);
                }
            }
        }
    }
}

// 检查刺客羁绊
function checkAssassinSynergy(startIndex, endIndex, side) {
    // 定义刺客类型单位
    const assassinUnits = ['waterDiver', 'electricFlash', 'earth', 'fireSpear', 'darkQueen'];
    
    // 收集上场的刺客单位类型
    const assassinTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && assassinUnits.includes(unit.type)) {
            assassinTypes.add(unit.type);
        }
    }
    
    // 记录找到的刺客类型
    gameState.synergy[side].assassinTypes = Array.from(assassinTypes);
    
    // 如果至少有3种不同的刺客类型，激活羁绊效果
    if (assassinTypes.size >= 3) {
        // 标记羁绊激活
        gameState.synergy[side].assassinSynergyActive = true;
        
        // 激活对应的刺客羁绊图标
        const iconId = `${side}-assassin`;
        const synergyIcon = document.getElementById(iconId);
        if (synergyIcon) {
            synergyIcon.classList.add('active');
        }
        
        // 应用羁绊效果 - 增加速度
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit) {
                // 增加速度
                if (!unit.bonusSpeed) {
                    unit.bonusSpeed = 0;
                }
                unit.bonusSpeed += 1;
                
                // 显示增益效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (unitCell) {
                    const buffText = createDamageNumber('+1⚡', '#FFEB3B');
                    unitCell.appendChild(buffText);
                    setTimeout(() => {
                        if (unitCell.contains(buffText)) {
                            unitCell.removeChild(buffText);
                        }
                    }, 1500);
                }
            }
        }
        
        // 在应用完羁绊效果后立即重新排序战斗单位
        console.log("刺客羁绊生效，重新排序单位");
        // 重新排序单位（考虑减速和羁绊加成效果）
        sortBattleUnitsBySpeed();
    }
}

// 根据速度重新排序战斗单位的辅助函数
function sortBattleUnitsBySpeed() {
    if (!battleUnits || battleUnits.length === 0) return;
    
    battleUnits.sort((a, b) => {
        // 获取实际速度（考虑减速效果和羁绊加成）
        const getEffectiveSpeed = (unitData) => {
            // 基础速度 - 使用单位自身的speed属性，而不是unitTypes中的基础值
            let effectiveSpeed = unitData.unit.speed;
            
            // 考虑减速效果
            if (unitData.unit.tempSpeed !== undefined) {
                effectiveSpeed = unitData.unit.tempSpeed;
            }
            
            // 考虑刺客羁绊速度加成
            if (unitData.unit.bonusSpeed) {
                effectiveSpeed += unitData.unit.bonusSpeed;
            }
            
            return effectiveSpeed;
        };
        
        const aSpeed = getEffectiveSpeed(a);
        const bSpeed = getEffectiveSpeed(b);
        
        // 速度相同敌方优先
        if (aSpeed === bSpeed) {
            if (a.isEnemy && !b.isEnemy) return -1;
            if (!a.isEnemy && b.isEnemy) return 1;
            
            // 敌方单位速度相同时，自下而上，自左往右
            if (a.isEnemy && b.isEnemy) {
                const aRow = Math.floor(a.index / 6);
                const bRow = Math.floor(b.index / 6);
                if (aRow !== bRow) return bRow - aRow; 
                return a.index % 6 - b.index % 6; 
            }
            
            // 我方单位速度相同时，自上而下，自左往右
            const aRow = Math.floor(a.index / 6);
            const bRow = Math.floor(b.index / 6);
            if (aRow !== bRow) return aRow - bRow; 
            return a.index % 6 - b.index % 6; 
        }
        
        // 按速度降序排列
        return bSpeed - aSpeed;
    });
    
    // 打印重排序后的行动顺序
    console.log(`重新排序后的行动顺序:`);
    battleUnits.forEach((unitData, index) => {
        // 获取实际速度（考虑所有速度加成效果）
        let effectiveSpeed = unitData.unit.speed;
        
        // 考虑减速效果
        if (unitData.unit.tempSpeed !== undefined) {
            effectiveSpeed = unitData.unit.tempSpeed;
        }
        
        // 考虑刺客羁绊速度加成
        if (unitData.unit.bonusSpeed) {
            effectiveSpeed += unitData.unit.bonusSpeed;
        }
        
        console.log(`${index+1}. ${unitData.unit.type} (速度: ${effectiveSpeed})`);
    });
}

// 检查辅助羁绊
function checkSupportSynergy(startIndex, endIndex, side) {
    // 定义辅助类型单位
    const supportUnits = ['waterMage', 'earthPup', 'grass', 'lotusNymph', 'motherOfLife'];
    
    // 收集上场的辅助单位类型
    const supportTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && supportUnits.includes(unit.type)) {
            supportTypes.add(unit.type);
        }
    }
    
    // 记录找到的辅助类型
    gameState.synergy[side].supportTypes = Array.from(supportTypes);
    
    // 如果至少有3种不同的辅助类型，激活羁绊效果
    if (supportTypes.size >= 3) {
        // 标记羁绊激活
        gameState.synergy[side].supportSynergyActive = true;
        
        // 激活对应的辅助羁绊图标
        const iconId = `${side}-support`;
        const synergyIcon = document.getElementById(iconId);
        if (synergyIcon) {
            synergyIcon.classList.add('active');
        }
        
        // 注意：辅助羁绊的恢复效果不在这里应用，而是在战斗结束时处理
        // 仅在此处显示激活效果提示
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit) {
                // 显示增益效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (unitCell) {
                    const buffText = createDamageNumber('💖治愈', '#4FC3F7');
                    unitCell.appendChild(buffText);
                    setTimeout(() => {
                        if (unitCell.contains(buffText)) {
                            unitCell.removeChild(buffText);
                        }
                    }, 1500);
                }
            }
        }
    }
}

// 应用辅助羁绊的治疗效果
function applySupportSynergyHealing() {
    // 检查玩家方辅助羁绊是否激活
    if (gameState.synergy.player.supportSynergyActive) {
        // 为所有玩家单位应用治疗
        for (let i = 24; i < 48; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && unit.currentHP > 0 && unit.currentHP < unit.maxHP) {
                // 计算恢复量：损失生命值的50%
                const lostHP = unit.maxHP - unit.currentHP;
                const healAmount = Math.round(lostHP * 0.5);
                
                if (healAmount > 0) {
                    unit.currentHP = Math.min(unit.maxHP, unit.currentHP + healAmount);
                    
                    // 显示治疗效果
                    const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                    if (unitCell) {
                        const healText = createDamageNumber(`+${healAmount}❤️`, '#4CAF50');
                        unitCell.appendChild(healText);
                        setTimeout(() => {
                            if (unitCell.contains(healText)) {
                                unitCell.removeChild(healText);
                            }
                        }, 1500);
                    }
                    
                    // 更新单位显示
                    updateUnitDisplay(i);
                }
            }
        }
    }
    
    // 检查敌方辅助羁绊是否激活
    if (gameState.synergy.enemy.supportSynergyActive) {
        // 为所有敌方单位应用治疗
        for (let i = 0; i < 24; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && unit.currentHP > 0 && unit.currentHP < unit.maxHP) {
                // 计算恢复量：损失生命值的50%
                const lostHP = unit.maxHP - unit.currentHP;
                const healAmount = Math.round(lostHP * 0.5);
                
                if (healAmount > 0) {
                    unit.currentHP = Math.min(unit.maxHP, unit.currentHP + healAmount);
                    
                    // 显示治疗效果
                    const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                    if (unitCell) {
                        const healText = createDamageNumber(`+${healAmount}❤️`, '#4CAF50');
                        unitCell.appendChild(healText);
                        setTimeout(() => {
                            if (unitCell.contains(healText)) {
                                unitCell.removeChild(healText);
                            }
                        }, 1500);
                    }
                    
                    // 更新单位显示
                    updateUnitDisplay(i);
                }
            }
        }
    }
}

// 检查火属性共鸣
function checkFireResonance(startIndex, endIndex, side) {
    // 定义火属性单位类型
    const fireUnits = ['fire', 'fireGunner', 'fireMage', 'fireSpear', 'holyWarrior', 'holyAngel'];
    
    // 收集上场的火属性单位类型
    const fireTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && fireUnits.includes(unit.type)) {
            fireTypes.add(unit.type);
        }
    }
    
    // 记录找到的火属性单位类型
    gameState.synergy[side].fireTypes = Array.from(fireTypes);
    
    // 如果至少有3种不同的火属性单位类型，激活共鸣效果
    if (fireTypes.size >= 3) {
        // 标记火属性共鸣激活
        gameState.synergy[side].fireResonanceActive = true;
        
        // 激活对应的火属性共鸣图标
        const iconId = `${side}-fire-resonance`;
        const resonanceIcon = document.getElementById(iconId);
        if (resonanceIcon) {
            resonanceIcon.classList.add('active');
        }
        
        // 显示火属性共鸣效果提示
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && fireUnits.includes(unit.type)) {
                // 显示共鸣激活效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (unitCell) {
                    const buffText = createDamageNumber('🔥共鸣', '#FF5252');
                    unitCell.appendChild(buffText);
                    setTimeout(() => {
                        if (unitCell.contains(buffText)) {
                            unitCell.removeChild(buffText);
                        }
                    }, 1500);
                }
            }
        }
    }
}

// 应用火属性共鸣的灼烧效果
function applyFireResonanceEffect() {
    // 检查玩家方火属性共鸣是否激活
    if (gameState.synergy.player.fireResonanceActive) {
        // 为所有敌方单位应用灼烧效果
        for (let i = 0; i < 24; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && unit.currentHP > 0) {
                // 20%概率触发灼烧效果
                if (Math.random() < 0.2) {
                    // 计算灼烧伤害：初始血量的5%
                    const burnDamage = Math.round(unitTypes[unit.type].hp * 0.05);
                    
                    if (burnDamage > 0) {
                        unit.currentHP = Math.max(0, unit.currentHP - burnDamage);
                        
                        // 显示灼烧效果
                        const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                        if (unitCell) {
                            const burnText = createDamageNumber(`-${burnDamage}🔥`, '#FF5252');
                            unitCell.appendChild(burnText);
                            setTimeout(() => {
                                if (unitCell.contains(burnText)) {
                                    unitCell.removeChild(burnText);
                                }
                            }, 1500);
                        }
                        
                        // 更新单位显示
                        updateUnitDisplay(i);
                        
                        // 检查单位是否死亡
                        if (unit.currentHP <= 0) {
                            // 查找该单位在battleUnits中的位置
                            const unitDataIndex = battleUnits.findIndex(data => data.index === i);
                            if (unitDataIndex !== -1) {
                                handleUnitDeath(battleUnits[unitDataIndex]);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 检查敌方火属性共鸣是否激活
    if (gameState.synergy.enemy.fireResonanceActive) {
        // 为所有玩家方单位应用灼烧效果
        for (let i = 24; i < 48; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && unit.currentHP > 0) {
                // 20%概率触发灼烧效果
                if (Math.random() < 0.2) {
                    // 计算灼烧伤害：初始血量的5%
                    const burnDamage = Math.round(unitTypes[unit.type].hp * 0.05);
                    
                    if (burnDamage > 0) {
                        unit.currentHP = Math.max(0, unit.currentHP - burnDamage);
                        
                        // 显示灼烧效果
                        const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                        if (unitCell) {
                            const burnText = createDamageNumber(`-${burnDamage}🔥`, '#FF5252');
                            unitCell.appendChild(burnText);
                            setTimeout(() => {
                                if (unitCell.contains(burnText)) {
                                    unitCell.removeChild(burnText);
                                }
                            }, 1500);
                        }
                        
                        // 更新单位显示
                        updateUnitDisplay(i);
                        
                        // 检查单位是否死亡
                        if (unit.currentHP <= 0) {
                            // 查找该单位在battleUnits中的位置
                            const unitDataIndex = battleUnits.findIndex(data => data.index === i);
                            if (unitDataIndex !== -1) {
                                handleUnitDeath(battleUnits[unitDataIndex]);
                            }
                        }
                    }
                }
            }
        }
    }
}

// 检查水属性共鸣
function checkWaterResonance(startIndex, endIndex, side) {
    // 定义水属性单位类型
    const waterUnits = ['waterMage', 'water', 'waterDiver', 'frostMage', 'motherOfLife'];
    
    // 收集上场的水属性单位类型
    const waterTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && waterUnits.includes(unit.type)) {
            waterTypes.add(unit.type);
        }
    }
    
    // 记录找到的水属性单位类型
    gameState.synergy[side].waterTypes = Array.from(waterTypes);
    
    // 如果至少有1种水属性单位类型，激活共鸣效果
    if (waterTypes.size >= 3) {
        // 标记水属性共鸣激活
        gameState.synergy[side].waterResonanceActive = true;
        
        // 激活对应的水属性共鸣图标
        const iconId = `${side}-water-resonance`;
        const resonanceIcon = document.getElementById(iconId);
        if (resonanceIcon) {
            resonanceIcon.classList.add('active');
        }
        
        // 显示水属性共鸣效果提示
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && waterUnits.includes(unit.type)) {
                // 显示共鸣激活效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (unitCell) {
                    const buffText = createDamageNumber('💧共鸣', '#4FC3F7');
                    unitCell.appendChild(buffText);
                    setTimeout(() => {
                        if (unitCell.contains(buffText)) {
                            unitCell.removeChild(buffText);
                        }
                    }, 1500);
                }
            }
        }
    }
}

// 检查草属性共鸣
function checkGrassResonance(startIndex, endIndex, side) {
    // 定义草属性单位类型
    const grassUnits = ['grassBiochemist', 'grassNun', 'grass', 'lotusNymph', 'motherOfLife'];
    
    // 收集上场的草属性单位类型
    const grassTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && grassUnits.includes(unit.type)) {
            grassTypes.add(unit.type);
        }
    }
    
    // 记录找到的草属性单位类型
    gameState.synergy[side].grassTypes = Array.from(grassTypes);
    
    // 如果至少有1种草属性单位类型，激活共鸣效果
    if (grassTypes.size >= 3) {
        // 标记草属性共鸣激活
        gameState.synergy[side].grassResonanceActive = true;
        
        // 激活对应的草属性共鸣图标
        const iconId = `${side}-grass-resonance`;
        const resonanceIcon = document.getElementById(iconId);
        if (resonanceIcon) {
            resonanceIcon.classList.add('active');
        }
        
        // 显示草属性共鸣效果提示
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && grassUnits.includes(unit.type)) {
                // 显示共鸣激活效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (unitCell) {
                    const buffText = createDamageNumber('🌿共鸣', '#66BB6A');
                    unitCell.appendChild(buffText);
                    setTimeout(() => {
                        if (unitCell.contains(buffText)) {
                            unitCell.removeChild(buffText);
                        }
                    }, 1500);
                }
            }
        }
    }
}

// 检查土属性共鸣
function checkEarthResonance(startIndex, endIndex, side) {
    // 定义土属性单位类型
    const earthUnits = ['earth', 'earthPup', 'earthGuardian', 'lavaGuardian', 'holyWarrior', 'holyAngel'];
    
    // 收集上场的土属性单位类型
    const earthTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && earthUnits.includes(unit.type)) {
            earthTypes.add(unit.type);
        }
    }
    
    // 记录找到的土属性单位类型
    gameState.synergy[side].earthTypes = Array.from(earthTypes);
    
    // 如果至少有3种不同的土属性单位类型，激活羁绊效果
    if (earthTypes.size >= 3) {
        // 标记羁绊激活
        gameState.synergy[side].earthResonanceActive = true;
        
        // 激活对应的土属性共鸣图标
        const iconId = `${side}-earth`;
        const synergyIcon = document.getElementById(iconId);
        if (synergyIcon) {
            synergyIcon.classList.add('active');
        }
        
        // 应用羁绊效果 - 为所有土属性单位添加减伤效果
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && earthUnits.includes(unit.type)) {
                // 添加减伤标记
                unit.earthResonanceBuff = true;
                
                // 显示增益效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (unitCell) {
                    const buffText = createDamageNumber('减伤!', '#8B4513');
                    unitCell.appendChild(buffText);
                    setTimeout(() => {
                        if (unitCell.contains(buffText)) {
                            unitCell.removeChild(buffText);
                        }
                    }, 1500);
                }
            }
        }
    }
}

// 检查电属性共鸣
function checkElectricResonance(startIndex, endIndex, side) {
    // 定义电属性单位类型
    const electricUnits = ['electricThor', 'electricWizard', 'electricThunder', 'electricFlash'];
    
    // 收集上场的电属性单位类型
    const electricTypes = new Set();
    for (let i = startIndex; i < endIndex; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && electricUnits.includes(unit.type)) {
            electricTypes.add(unit.type);
        }
    }
    
    // 记录找到的电属性单位类型
    gameState.synergy[side].electricTypes = Array.from(electricTypes);
    
    // 如果至少有1种电属性单位类型，激活共鸣效果
    if (electricTypes.size >= 3) {
        // 标记电属性共鸣激活
        gameState.synergy[side].electricResonanceActive = true;
        
        // 激活对应的电属性共鸣图标
        const iconId = `${side}-electric-resonance`;
        const resonanceIcon = document.getElementById(iconId);
        if (resonanceIcon) {
            resonanceIcon.classList.add('active');
        }
        
        // 显示电属性共鸣效果提示
        for (let i = startIndex; i < endIndex; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && electricUnits.includes(unit.type)) {
                // 显示共鸣激活效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (unitCell) {
                    const buffText = createDamageNumber('⚡共鸣', '#FFEB3B');
                    unitCell.appendChild(buffText);
                    setTimeout(() => {
                        if (unitCell.contains(buffText)) {
                            unitCell.removeChild(buffText);
                        }
                    }, 1500);
                }
            }
        }
    }
}

// 应用草属性共鸣效果 - 削弱敌方回蓝量
function applyGrassResonanceEffect() {
    // 检查玩家方草属性共鸣是否激活
    if (gameState.synergy.player.grassResonanceActive) {
        // 获取敌方单位
        const enemyUnits = [];
        for (let i = 0; i < 24; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && unit.currentHP > 0) {
                enemyUnits.push({
                    unit: unit,
                    index: i
                });
            }
        }
        
        // 随机选择最多3名敌方单位削弱回蓝量
        const targetCount = Math.min(3, enemyUnits.length);
        if (targetCount > 0) {
            // 随机打乱敌方单位数组
            for (let i = enemyUnits.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [enemyUnits[i], enemyUnits[j]] = [enemyUnits[j], enemyUnits[i]];
            }
            
            // 对选中的单位应用削弱效果
            for (let i = 0; i < targetCount; i++) {
                const targetData = enemyUnits[i];
                const targetUnit = targetData.unit;
                const baseStats = unitTypes[targetUnit.type];
                
                if (baseStats && baseStats.manaRegen) {
                    // 削弱回蓝量50%
                    targetUnit.grassResonanceDebuff = true; // 标记单位受到了草属性共鸣削弱
                    
                    // 显示削弱效果
                    const unitCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                    if (unitCell) {
                        const debuffText = createDamageNumber(`-50%🔵`, '#66BB6A');
                        unitCell.appendChild(debuffText);
                        setTimeout(() => {
                            if (unitCell.contains(debuffText)) {
                                unitCell.removeChild(debuffText);
                            }
                        }, 1500);
                    }
                }
            }
        }
    }
    
    // 检查敌方草属性共鸣是否激活
    if (gameState.synergy.enemy.grassResonanceActive) {
        // 获取玩家方单位
        const playerUnits = [];
        for (let i = 24; i < 48; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && unit.currentHP > 0) {
                playerUnits.push({
                    unit: unit,
                    index: i
                });
            }
        }
        
        // 随机选择最多3名玩家方单位削弱回蓝量
        const targetCount = Math.min(3, playerUnits.length);
        if (targetCount > 0) {
            // 随机打乱玩家方单位数组
            for (let i = playerUnits.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [playerUnits[i], playerUnits[j]] = [playerUnits[j], playerUnits[i]];
            }
            
            // 对选中的单位应用削弱效果
            for (let i = 0; i < targetCount; i++) {
                const targetData = playerUnits[i];
                const targetUnit = targetData.unit;
                const baseStats = unitTypes[targetUnit.type];
                
                if (baseStats && baseStats.manaRegen) {
                    // 削弱回蓝量50%
                    targetUnit.grassResonanceDebuff = true; // 标记单位受到了草属性共鸣削弱
                    
                    // 显示削弱效果
                    const unitCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                    if (unitCell) {
                        const debuffText = createDamageNumber(`-50%🔵`, '#66BB6A');
                        unitCell.appendChild(debuffText);
                        setTimeout(() => {
                            if (unitCell.contains(debuffText)) {
                                unitCell.removeChild(debuffText);
                            }
                        }, 1500);
                    }
                }
            }
        }
    }
}

// 应用水属性共鸣效果 - 削弱敌方攻击力
function applyWaterResonanceEffect() {
    // 检查玩家方水属性共鸣是否激活
    if (gameState.synergy.player.waterResonanceActive) {
        // 获取敌方单位
        const enemyUnits = [];
        for (let i = 0; i < 24; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && unit.currentHP > 0) {
                enemyUnits.push({
                    unit: unit,
                    index: i
                });
            }
        }
        
        // 随机选择最多3名敌方单位削弱攻击力
        const targetCount = Math.min(3, enemyUnits.length);
        if (targetCount > 0) {
            // 随机打乱敌方单位数组
            for (let i = enemyUnits.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [enemyUnits[i], enemyUnits[j]] = [enemyUnits[j], enemyUnits[i]];
            }
            
            // 对选中的单位应用削弱效果
            for (let i = 0; i < targetCount; i++) {
                const targetData = enemyUnits[i];
                const targetUnit = targetData.unit;
                
                // 计算削弱的攻击力值（20%）
                const debuffAmount = Math.round(targetUnit.attack * 0.2);
                targetUnit.attack -= debuffAmount;
                targetUnit.waterResonanceDebuff = true; // 标记单位受到了水属性共鸣削弱
                
                // 显示削弱效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                if (unitCell) {
                    const debuffText = createDamageNumber(`-${debuffAmount}⚔️`, '#4FC3F7');
                    unitCell.appendChild(debuffText);
                    setTimeout(() => {
                        if (unitCell.contains(debuffText)) {
                            unitCell.removeChild(debuffText);
                        }
                    }, 1500);
                }
                
                // 更新单位显示
                updateUnitDisplay(targetData.index);
            }
        }
    }
    
    // 检查敌方水属性共鸣是否激活
    if (gameState.synergy.enemy.waterResonanceActive) {
        // 获取玩家方单位
        const playerUnits = [];
        for (let i = 24; i < 48; i++) {
            const unit = gameState.units.battleField[i];
            if (unit && unit.currentHP > 0) {
                playerUnits.push({
                    unit: unit,
                    index: i
                });
            }
        }
        
        // 随机选择最多3名玩家方单位削弱攻击力
        const targetCount = Math.min(3, playerUnits.length);
        if (targetCount > 0) {
            // 随机打乱玩家方单位数组
            for (let i = playerUnits.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [playerUnits[i], playerUnits[j]] = [playerUnits[j], playerUnits[i]];
            }
            
            // 对选中的单位应用削弱效果
            for (let i = 0; i < targetCount; i++) {
                const targetData = playerUnits[i];
                const targetUnit = targetData.unit;
                
                // 计算削弱的攻击力值（20%）
                const debuffAmount = Math.round(targetUnit.attack * 0.2);
                targetUnit.attack -= debuffAmount;
                targetUnit.waterResonanceDebuff = true; // 标记单位受到了水属性共鸣削弱
                
                // 显示削弱效果
                const unitCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                if (unitCell) {
                    const debuffText = createDamageNumber(`-${debuffAmount}⚔️`, '#4FC3F7');
                    unitCell.appendChild(debuffText);
                    setTimeout(() => {
                        if (unitCell.contains(debuffText)) {
                            unitCell.removeChild(debuffText);
                        }
                    }, 1500);
                }
                
                // 更新单位显示
                updateUnitDisplay(targetData.index);
            }
        }
    }
}

// 初始化所有羁绊图标（灰色未激活状态）
function initSynergyIcons() {
    // 清除已有图标
    const existingIcons = document.querySelectorAll('.synergy-icon');
    existingIcons.forEach(icon => {
        icon.parentNode.removeChild(icon);
    });
    
    // 移除已有的图标容器
    const existingContainers = document.querySelectorAll('.synergy-container');
    existingContainers.forEach(container => {
        container.parentNode.removeChild(container);
    });
    
    const cageContainer = document.getElementById('cage-container');
    const battleScreen = document.getElementById('battle-screen');
    
    // 创建玩家方职业羁绊图标容器
    const playerJobContainer = document.createElement('div');
    playerJobContainer.className = 'synergy-container player-synergy-container';
    playerJobContainer.style.position = 'absolute';
    playerJobContainer.style.top = '2px';
    playerJobContainer.style.left = '35px';
    playerJobContainer.style.display = 'flex';
    playerJobContainer.style.flexDirection = 'row';
    playerJobContainer.style.zIndex = '10';
    battleScreen.appendChild(playerJobContainer);
    
    // 创建玩家方属性共鸣图标容器
    const playerResonanceContainer = document.createElement('div');
    playerResonanceContainer.className = 'synergy-container player-resonance-container';
    playerResonanceContainer.style.position = 'absolute';
    playerResonanceContainer.style.top = '35px'; // 放在职业羁绊图标下方
    playerResonanceContainer.style.left = '35px';
    playerResonanceContainer.style.display = 'flex';
    playerResonanceContainer.style.flexDirection = 'row';
    playerResonanceContainer.style.zIndex = '10';
    battleScreen.appendChild(playerResonanceContainer);
    
    // 创建敌方职业羁绊图标容器
    const enemyJobContainer = document.createElement('div');
    enemyJobContainer.className = 'synergy-container enemy-synergy-container';
    enemyJobContainer.style.position = 'absolute';
    enemyJobContainer.style.top = '2px';
    enemyJobContainer.style.right = '35px';
    enemyJobContainer.style.display = 'flex';
    enemyJobContainer.style.flexDirection = 'row';
    enemyJobContainer.style.zIndex = '10';
    battleScreen.appendChild(enemyJobContainer);
    
    // 创建敌方属性共鸣图标容器
    const enemyResonanceContainer = document.createElement('div');
    enemyResonanceContainer.className = 'synergy-container enemy-resonance-container';
    enemyResonanceContainer.style.position = 'absolute';
    enemyResonanceContainer.style.top = '35px'; // 放在职业羁绊图标下方
    enemyResonanceContainer.style.right = '35px';
    enemyResonanceContainer.style.display = 'flex';
    enemyResonanceContainer.style.flexDirection = 'row';
    enemyResonanceContainer.style.zIndex = '10';
    battleScreen.appendChild(enemyResonanceContainer);
    
    // 职业羁绊类型
    const jobSynergyTypes = [
        { type: 'warrior', icon: '⚔️', title: '战士羁绊：增加初始血量20%' },
        { type: 'mage', icon: '🔮', title: '法师羁绊：初始蓝量为100' },
        { type: 'ranged', icon: '🏹', title: '远程羁绊：增加攻击力20%' },
        { type: 'assassin', icon: '🗡️', title: '刺客羁绊：速度+1' },
        { type: 'support', icon: '💖', title: '辅助羁绊：战斗结束后回复所有己方单位50%损失生命值' }
    ];
    
    // 属性共鸣类型
    const resonanceTypes = [
        { type: 'fire-resonance', icon: '🔥', title: '火属性共鸣：每回合有20%几率对敌方单位造成初始血量5%的伤害' },
        { type: 'water-resonance', icon: '💧', title: '水属性共鸣：随机削弱3名敌方单位20%攻击力' },
        { type: 'electric-resonance', icon: '⚡', title: '电属性共鸣：所有己方单位有15%几率闪避攻击' },
        { type: 'earth', icon: '🪨', title: '土属性共鸣：所有己方土属性单位减伤20%' },
        { type: 'grass-resonance', icon: '🌿', title: '草属性共鸣：随机削弱3名敌方单位50%回蓝量' },
    ];
    
    // 创建玩家方职业羁绊图标
    jobSynergyTypes.forEach(synergy => {
        const icon = document.createElement('div');
        icon.className = `synergy-icon player ${synergy.type}`;
        icon.textContent = synergy.icon;
        icon.title = synergy.title;
        icon.id = `player-${synergy.type}`;
        icon.style.position = 'relative';
        icon.style.margin = '0 3px';
        icon.style.top = '0';
        icon.style.left = '0';
        playerJobContainer.appendChild(icon);
    });
    
    // 创建玩家方属性共鸣图标
    resonanceTypes.forEach(synergy => {
        const icon = document.createElement('div');
        icon.className = `synergy-icon player ${synergy.type}`;
        icon.textContent = synergy.icon;
        icon.title = synergy.title;
        icon.id = `player-${synergy.type}`;
        icon.style.position = 'relative';
        icon.style.margin = '0 3px';
        icon.style.top = '0';
        icon.style.left = '0';
        playerResonanceContainer.appendChild(icon);
    });
    
    // 创建敌方职业羁绊图标
    jobSynergyTypes.forEach(synergy => {
        const icon = document.createElement('div');
        icon.className = `synergy-icon enemy ${synergy.type}`;
        icon.textContent = synergy.icon;
        icon.title = synergy.title;
        icon.id = `enemy-${synergy.type}`;
        icon.style.position = 'relative';
        icon.style.margin = '0 3px';
        icon.style.top = '0';
        icon.style.left = '0';
        enemyJobContainer.appendChild(icon);
    });
    
    // 创建敌方属性共鸣图标
    resonanceTypes.forEach(synergy => {
        const icon = document.createElement('div');
        icon.className = `synergy-icon enemy ${synergy.type}`;
        icon.textContent = synergy.icon;
        icon.title = synergy.title;
        icon.id = `enemy-${synergy.type}`;
        icon.style.position = 'relative';
        icon.style.margin = '0 3px';
        icon.style.top = '0';
        icon.style.left = '0';
        enemyResonanceContainer.appendChild(icon);
    });
}