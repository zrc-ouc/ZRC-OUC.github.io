// 单位类型及其属性
const unitTypes = {

    // 拳击手
    fire: { 
        hp: 40,
        attack: 10, 
        speed: 6,
        manaRegen: 25,
        color: '#FF5252', 
        icon: '🔥',
        job: 'warrior',
        name: '拳击手',
        inPool: 1,
        element: 'fire',
        isTrap: false,
        skill: {
            type: 'active',
            name: '暴击',
            description: '造成150%伤害',
            effect: (attacker, target) => {
                return attacker.attack * 1.5;
            }
        },
        // 2级解锁被动技能：反击
        passiveSkills: {
            counterAttack: {
                name: '反击',
                description: '发动反击造成30%伤害',
                unlockLevel: 2,
                isCountering: false, // 防止反击循环的标记
                effect: (defender, attacker) => {
                    return defender.attack * 0.3;
                }
            },
            bloodRage: {
                name: '血怒',
                description: '血量每减少10%，攻击力增加5%',
                unlockLevel: 3,
                effect: (unit) => {
                    // 计算已损失的生命值百分比
                    const lostHpPercent = (1 - unit.currentHP / unit.maxHP) * 100;
                    // 每损失10%生命值，攻击力增加5%
                    const bonusPercent = Math.floor(lostHpPercent / 10) * 5;
                    return bonusPercent;
                },
                // 应用血怒效果
                applyBloodRage: (unit) => {
                    if (unit.level >= 3) {
                        // 保存原始攻击力，用于战斗结束时恢复
                        if (!unit.bloodRageOriginalAttack) {
                            // 记录原始攻击力
                            unit.bloodRageOriginalAttack = unit.attack;
                        }

                        // 计算血怒加成
                        const bonusPercent = unitTypes.fire.passiveSkills.bloodRage.effect(unit);
                        
                        // 重新计算基础攻击力（3级时是1级的4倍，如果是傀儡则只有50%）
                        let baseAttack = unit.bloodRageOriginalAttack;
                        
                        // 应用血怒加成
                        if (bonusPercent > 0) {
                            // 计算新的攻击力
                            unit.attack = Math.round(baseAttack * (1 + bonusPercent / 100));
                            console.log(`应用血怒效果：${unit.type}的攻击力从${baseAttack}增加到${unit.attack}（+${bonusPercent}%）`);
                        }
                    }
                },
                // 重置血怒效果
                resetBloodRage: (unit) => {
                    if (unit.bloodRageOriginalAttack) {
                        // 恢复原始攻击力
                        unit.attack = unit.bloodRageOriginalAttack;
                        // 清除原始攻击力记录
                        delete unit.bloodRageOriginalAttack;
                        console.log(`重置血怒效果：${unit.type}的攻击力恢复到${unit.attack}`);
                    }
                }
            }
        }
    },

    // 火枪手
    fireGunner: { 
        hp: 500, 
        attack: 10, 
        speed: 5, 
        manaRegen: 50,
        color: '#FF5252', 
        icon: '🔫',
        job: 'ranged',
        name: '火枪手',
        inPool: 0,
        element: 'fire',
        skill: {
            type: 'active',
            name: '双发',
            description: '连续发动2次80%攻击',
            effect: (attacker, target) => {
                return attacker.attack * 0.8;
            },
            repeatTimes: 2,
            executeDoubleShot: (attackerUnit, attackerIndex, attackerData, isEnemy) => {
                // 标记技能执行中
                isSkillExecuting = true;
                let damage = 0;
                
                const performDoubleShot = (attackIndex) => {
                    if (attackIndex >= unitTypes.fireGunner.skill.repeatTimes) {
                        isSkillExecuting = false;
                        return; // 结束递归
                    }
                    
                    // 寻找攻击目标
                    let currentTarget = findDefaultTarget(attackerIndex, isEnemy);
                    
                    if (currentTarget) {
                        const targetCell = document.querySelector(`.grid-cell[data-index="${currentTarget.index}"]`);
                        
                                // 造成伤害
                        damage = unitTypes.fireGunner.skill.effect(attackerUnit, currentTarget.unit);
                        
                        // 检查是否触发爆头（3级被动技能）
                        if (attackerUnit.level >= 1 && unitTypes.fireGunner.passiveSkills && 
                            unitTypes.fireGunner.passiveSkills.headshot) {
                            const headshotTriggered = unitTypes.fireGunner.passiveSkills.headshot.effect(currentTarget.unit);
                            
                            if (headshotTriggered) {
                                // 如果触发爆头，直接秒杀目标
                                const headshotDamage = currentTarget.unit.currentHP;
                                applyDamage(currentTarget, headshotDamage, targetCell, attackerData);
                                
                                // 显示爆头效果
                                const headshotIndicator = createDamageNumber('爆头!', '#FF0000');
                                targetCell.appendChild(headshotIndicator);
                                
                                setTimeout(() => {
                                    if (targetCell.contains(headshotIndicator)) {
                                        targetCell.removeChild(headshotIndicator);
                                    }
                                }, 1000);
                            } else {
                                // 正常造成伤害
                                applyDamage(currentTarget, damage, targetCell, attackerData);
                            }
                        } else {
                            // 正常造成伤害
                            applyDamage(currentTarget, damage, targetCell, attackerData);
                        }
                        
                        // 检查是否触发穿透（2级被动技能）
                        if (attackerUnit.level >= 1 && unitTypes.fireGunner.passiveSkills && 
                            unitTypes.fireGunner.passiveSkills.penetration) {
                            unitTypes.fireGunner.passiveSkills.penetration.effect(attackerUnit, currentTarget, attackerIndex, isEnemy, attackerData);
                        }
                        
                        setTimeout(() => {
                            performDoubleShot(attackIndex + 1);
                        }, 300);
                    } else {
                        console.log('双发技能提前结束：没有存活的敌人');
                        isSkillExecuting = false;
                        return;
                    }
                };
                
                // 开始第一次攻击
                performDoubleShot(0);
                
                return damage;
            }
        },
        passiveSkills: {
            penetration: {
                name: '穿透',
                description: '发动双发技能时每次攻击会额外对与攻击目标处于同一列且最近的1名对方单位造成当前攻击力50%的伤害',
                unlockLevel: 2,
                effect: (attackerUnit, target, attackerIndex, isEnemy, attackerData) => {
            // 获取目标所在列
                    const targetCol = target.index % 6;
                    const targetRow = Math.floor(target.index / 6);
            
                    // 查找同一列的其他敌人
                    const enemiesInSameCol = [];
                    
                    // 遍历战场上的所有单位
            for (let i = 0; i < battleUnits.length; i++) {
                        const unit = battleUnits[i];
                        
                        // 确保单位是敌人，并且还活着
                        if (unit.isEnemy !== isEnemy && unit.unit.currentHP > 0) {
                            const unitCol = unit.index % 6;
                            const unitRow = Math.floor(unit.index / 6);
                            
                            // 如果单位在同一列且不是目标本身
                            if (unitCol === targetCol && unit.index !== target.index) {
                                enemiesInSameCol.push({
                                    unit: unit,
                                    distance: Math.abs(unitRow - targetRow)
                                });
                            }
                        }
                    }
                    
                    // 如果找到了同一列的敌人
                    if (enemiesInSameCol.length > 0) {
                        // 按距离排序，找到最近的敌人
                        enemiesInSameCol.sort((a, b) => a.distance - b.distance);
                        const nearestEnemy = enemiesInSameCol[0].unit;
                        
                        // 造成50%伤害
                        const penetrationDamage = attackerUnit.attack * 0.5 * 0.8; // 双发是80%攻击力，穿透是50%
                        const enemyCell = document.querySelector(`.grid-cell[data-index="${nearestEnemy.index}"]`);
                        
                        if (enemyCell) {
                            // 显示穿透效果
                            const penetrationIndicator = createDamageNumber('穿透!', '#FFA500');
                            enemyCell.appendChild(penetrationIndicator);
                            
                            setTimeout(() => {
                                if (enemyCell.contains(penetrationIndicator)) {
                                    enemyCell.removeChild(penetrationIndicator);
                                }
                            }, 1000);
                            
                            // 应用伤害
                            applyDamage(nearestEnemy, penetrationDamage, enemyCell, attackerData);
                        }
                    }
                }
            },
            headshot: {
                name: '爆头',
                description: '发动双发技能时，若攻击目标血量低于10%，每次攻击有5%的概率直接秒杀该单位',
                unlockLevel: 3,
                effect: (targetUnit) => {
                    // 检查目标血量是否低于10%
                    if (targetUnit.currentHP / targetUnit.maxHP < 0.1) {
                        // 5%概率触发爆头
                        return Math.random() < 0.05;
                    }
                    return false;
                }
            }
        }
    },

    // 火焰法师
    fireMage: { 
        hp: 30, 
        attack: 5, 
        speed: 4, 
        manaRegen: 100, 
        color: '#FF5252', 
        icon: '🔮',
        job: 'mage',
        name: '火焰法师',
        inPool: 0,
        element: 'fire',
        isTrap: false,
        skill: {
            type: 'active',
            name: '火球',
            description: '对九宫格内单位造成500%伤害',
            effect: (attacker, target) => {
                return attacker.attack * 5;
            },
            executeFireballSkill: (attackerUnit, target, attackerIndex, attackerData, isEnemy) => {
                const targetIndex = target.index;
                const targetRow = Math.floor(targetIndex / 6);
                const targetCol = targetIndex % 6;
                
                // 火球范围效果
                const affectedCells = [];
                let enemyCount = 0; // 提纯技能
                let damage = 0;
                
                // 遍历九宫格
                for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                    for (let colOffset = -1; colOffset <= 1; colOffset++) {
                        const affectedRow = targetRow + rowOffset;
                        const affectedCol = targetCol + colOffset;
                        
                        // 是否在战场范围内
                        if (affectedRow >= 0 && affectedRow < 8 && affectedCol >= 0 && affectedCol < 6) {
                            const affectedIndex = affectedRow * 6 + affectedCol;
                            const affectedCell = document.querySelector(`.grid-cell[data-index="${affectedIndex}"]`);
                            
                            if (affectedCell) {
                                // 添加视觉效果
                                affectedCell.style.backgroundColor = 'rgba(255, 82, 82, 0.3)';
                                affectedCells.push(affectedCell);
                                
                                // 该位置是否有敌方单位
                                const affectedUnit = battleUnits.find(unit => 
                                    unit.index === affectedIndex && 
                                    unit.isEnemy !== isEnemy && 
                                    unit.unit.currentHP > 0
                                );
                                
                                if (affectedUnit) {
                                    enemyCount++;
                                    
                                    // 单位当前血量
                                    const beforeHP = affectedUnit.unit.currentHP;
                                    
                                    // 造成伤害
                                    damage = unitTypes.fireMage.skill.effect(attackerUnit, affectedUnit.unit);
                                    applyDamage(affectedUnit, damage, affectedCell);
                                    
                                    // 是否击杀目标
                                    if (attackerUnit.level >= 1 && beforeHP > 0 && affectedUnit.unit.currentHP <= 0) {
                                        // 自爆效果
                                        const explosionIndicator = createDamageNumber('自爆!', '#FF5252');
                                        affectedCell.appendChild(explosionIndicator);
                                        
                                        setTimeout(() => {
                                            if (affectedCell.contains(explosionIndicator)) {
                                                affectedCell.removeChild(explosionIndicator);
                                            }
                                        }, 1000);
                                        
                                        // 延迟触发自爆
                                        setTimeout(() => {
                                            unitTypes.fireMage.passiveSkills.selfDestruct.trigger(
                                                attackerUnit, 
                                                affectedUnit.index, 
                                                isEnemy
                                            );
                                        }, 300);
                                    }
                                }
                            }
                        }
                    }
                }
                
                // 提纯技能
                if (attackerUnit.level >= 1 && enemyCount > 0) {
                    const purificationSkill = unitTypes.fireMage.passiveSkills.purification;
                    
                    // 记录原始攻击力
                    if (!attackerUnit.originalAttack) {
                        attackerUnit.originalAttack = attackerUnit.attack;
                    }
                    
                    // 提升攻击力
                    const boost = enemyCount * 10;
                    attackerUnit.attack += boost;
                    
                    // 提纯效果
                    const attackerCell = document.querySelector(`.grid-cell[data-index="${attackerData.index}"]`);
                    if (attackerCell) {
                        const purificationIndicator = createDamageNumber('提纯! +' + boost, '#FFD700');
                        attackerCell.appendChild(purificationIndicator);
                        
                        setTimeout(() => {
                            if (attackerCell.contains(purificationIndicator)) {
                                attackerCell.removeChild(purificationIndicator);
                            }
                        }, 1000);
                    }
                    
                    updateUnitDisplay(attackerData.index);
                }
                
                setTimeout(() => {
                    affectedCells.forEach(cell => {
                        if (cell.classList.contains('enemy-area')) {
                            cell.style.backgroundColor = 'rgba(255, 82, 82, 0.1)';
                        } else if (cell.classList.contains('player-area')) {
                            cell.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
                        } else {
                            cell.style.backgroundColor = '#444';
                        }
                    });
                }, 500);
                
                return damage;
            }
        },
        passiveSkills: {
            purification: {
                name: '提纯',
                description: '技能命中提升攻击力，提升数值为敌人数量×10',
                // 记录原始攻击力，用于重置
                originalAttack: 0,
                // 统计敌人数量
                countEnemiesInRange: (targetIndex) => {
                    const targetRow = Math.floor(targetIndex / 6);
                    const targetCol = targetIndex % 6;
                    let count = 0;
                    
                    // 遍历九宫格
                for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                    for (let colOffset = -1; colOffset <= 1; colOffset++) {
                        const affectedRow = targetRow + rowOffset;
                        const affectedCol = targetCol + colOffset;
                        
                        // 检查是否在战场内
                        if (affectedRow >= 0 && affectedRow < 8 && affectedCol >= 0 && affectedCol < 6) {
                            const affectedIndex = affectedRow * 6 + affectedCol;
                            
                                // 查找是否有敌方单位
                                const hasEnemy = battleUnits.some(unit => 
                                    unit.index === affectedIndex && 
                                    unit.isEnemy !== isEnemy && 
                                    unit.unit.currentHP > 0
                                );
                                
                                if (hasEnemy) {
                                    count++;
                                }
                            }
                        }
                    }
                    return count;
                },
                // 提升攻击力
                boostAttack: (mage, enemyCount) => {
                    // 记录原始攻击力
                    if (this.originalAttack === 0) {
                        this.originalAttack = mage.attack;
                    }
                    console.log('enemyCount:', enemyCount);
                    // 提升攻击力
                    const boost = enemyCount * 10;
                    mage.attack += boost;
                    
                    return boost;
                },
                // 重置攻击力
                resetAttack: (mage) => {
                    if (this.originalAttack > 0) {
                        mage.attack = this.originalAttack;
                        this.originalAttack = 0;
                    }
                }
            },
            selfDestruct: {
                name: '自爆',
                description: '火球技能击杀目标发生自爆',
                trigger: (mage, targetIndex, isEnemy) => {
                    const targetRow = Math.floor(targetIndex / 6);
                    const targetCol = targetIndex % 6;
                    const affectedCells = [];
                    
                    // 遍历九宫格
            for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                for (let colOffset = -1; colOffset <= 1; colOffset++) {
                        const affectedRow = targetRow + rowOffset;
                        const affectedCol = targetCol + colOffset;
                    
                    // 检查是否在战场内
                    if (affectedRow >= 0 && affectedRow < 8 && affectedCol >= 0 && affectedCol < 6) {
                        const affectedIndex = affectedRow * 6 + affectedCol;
                                const affectedCell = document.querySelector(`.grid-cell[data-index="${affectedIndex}"]`);
                                
                                if (affectedCell) {
                                    // 视觉效果
                                    affectedCell.style.backgroundColor = 'rgba(255, 82, 82, 0.5)';
                                    affectedCells.push(affectedCell);
                                    
                                    // 查找是否有敌方单位
                                    const affectedUnit = battleUnits.find(unit => 
                                        unit.index === affectedIndex && 
                                        unit.isEnemy !== isEnemy && 
                                        unit.unit.currentHP > 0
                                    );
                                    
                                    if (affectedUnit) {
                                // 造成伤害
                                        const damage = mage.attack;
                                        applyDamage(affectedUnit, damage, affectedCell);
                            }
                        }
                    }
                }
            }
            
                    setTimeout(() => {
                        affectedCells.forEach(cell => {
                            if (cell.classList.contains('enemy-area')) {
                                cell.style.backgroundColor = 'rgba(255, 82, 82, 0.1)';
                            } else if (cell.classList.contains('player-area')) {
                                cell.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
                            } else {
                                cell.style.backgroundColor = '#444';
                            }
                        });
                    }, 500);
                }
            }
        }
    },

    // 水魔法师
    waterMage: {
        hp: 100,
        attack: 0,
        speed: 1,
        manaRegen: 0,
        color: '#4FC3F7',
        icon: '🧙‍♂️',
        job: 'support',
        name: '水魔法师',
        inPool: 0,
        element: 'water',
        isTrap: false,
        passiveSkills: {
            growth: {
                name: '生长',
                description: '连接单位提高20%攻击力和生命值',
                effect: function(target) {
                    // 提升攻击力和生命值
                    if (!target.growthApplied) {
                        // 记录原始值用于重置
                        target.originalMaxHP = target.originalMaxHP || target.maxHP;
                        target.originalAttack = target.originalAttack || target.attack;
                        target.maxHP = Math.round(target.originalMaxHP * 1.2);
                        target.attack = Math.round(target.originalAttack * 1.2);                                
                        const hpIncrease = Math.round(target.originalMaxHP * 0.2);
                        target.currentHP += hpIncrease;
                        
                        target.growthApplied = true;
                    }
                },
                unlockLevel: 2
            },
            selfHealing: {
                name: '自愈',
                description: '每回合回复自己和连接单位10%血量。',
                effect: function(self, linkedUnit) {
                    // 计算回复量（基于初始血量）
                    const healAmount = Math.round(unitTypes.waterMage.hp * 0. * 2 * 2);
                    
                    // 回复自己和
                    self.currentHP = Math.min(self.maxHP, self.currentHP + healAmount);
                    if (linkedUnit) {
                        linkedUnit.currentHP = Math.min(linkedUnit.maxHP, linkedUnit.currentHP + healAmount);
                    }
                },
                unlockLevel: 3
            }
        },
        skill: {
            type: 'passive',
            name: '生命链锁',
            description: '与最近己方单位相连，承担相连单位所受伤害的50%。（护盾期间不分担）',
            linkedAllies: {}, // 存储水魔法师链接信息
            effect: function(self, battleIndex) {
                // 战斗开始时初始化生命链锁
                if (!this.linkedAllies[battleIndex]) {
                    this.linkedAllies[battleIndex] = {
                        linkedAllyIndex: null,
                        lifeChainLine: null
                    };
                    
                    const selfData = battleUnits.find(unit => unit.index === battleIndex);
                    if (selfData) {
                        // 寻找最近单位
                        this.findAndLinkNearestAlly(battleIndex, selfData.isEnemy);
                    }
                }
            },
            
            // 寻找最近单位
            findAndLinkNearestAlly: function(mageIndex, isEnemy) {
                const mageCol = mageIndex % 6;
                const mageRow = Math.floor(mageIndex / 6);
            let closestAlly = null;
            let minDistance = Infinity;

                // 获取已链接单位索引
                const linkedIndices = Object.values(this.linkedAllies)
                    .map(info => info.linkedAllyIndex)
                    .filter(index => index !== null);
                
                // 寻找符合条件目标
            for (let i = 0; i < battleUnits.length; i++) {
                    const targetData = battleUnits[i];
                    
                    // 跳过敌方单位、自己、已死亡、水魔法师、傀儡和已被链接单位
                    if (targetData.isEnemy !== isEnemy || 
                        targetData.index === mageIndex || 
                        targetData.unit.currentHP <= 0 || 
                        targetData.unit.type === 'waterMage' ||
                        targetData.unit.isPuppet || 
                        targetData.unit.isTrap || // 排除机关单位
                        linkedIndices.includes(targetData.index)) continue;
                    
                    
                    const targetCol = targetData.index % 6;
                    const targetRow = Math.floor(targetData.index / 6);
                    
                    // 计算曼哈顿距离
                    const distance = Math.abs(targetRow - mageRow) + Math.abs(targetCol - mageCol);
                    
                    // 更新最近友方目标
                if (distance < minDistance) {
                    minDistance = distance;
                        closestAlly = targetData;
                }
            }
            
                // 找到符合单位建立链接
            if (closestAlly) {
                    this.linkedAllies[mageIndex].linkedAllyIndex = closestAlly.index;
                    this.createLifeChainLine(mageIndex, closestAlly.index);
                    
                    // 获取水魔法师单位
                    const mageData = battleUnits.find(unit => unit.index === mageIndex);
                    
                    // 应用生长效果
                    if (mageData && mageData.unit && mageData.unit.level >= 2) {
                        const growthSkill = unitTypes.waterMage.passiveSkills.growth;
                        growthSkill.effect(closestAlly.unit);
                        
                        // 更新单位显示
                        updateUnitDisplay(closestAlly.index);
                    }
                }
            },
            createLifeChainLine: function(sourceIndex, targetIndex) {
                // 移除旧链接线
                if (this.linkedAllies[sourceIndex] && this.linkedAllies[sourceIndex].lifeChainLine && 
                    this.linkedAllies[sourceIndex].lifeChainLine.parentNode) {
                    this.linkedAllies[sourceIndex].lifeChainLine.parentNode.removeChild(this.linkedAllies[sourceIndex].lifeChainLine);
                }
                
                const sourceCell = document.querySelector(`.grid-cell[data-index="${sourceIndex}"]`);
                const targetCell = document.querySelector(`.grid-cell[data-index="${targetIndex}"]`);
                
                if (sourceCell && targetCell) {
                    // 获取两个单元格位置
                    const sourceRect = sourceCell.getBoundingClientRect();
                    const targetRect = targetCell.getBoundingClientRect();
                    
                    // 创建连接线
                    const line = document.createElement('div');
                    line.style.position = 'absolute';
                    line.style.backgroundColor = '#4FC3F7'; // 蓝色
                    line.style.height = '3px';
                    line.style.zIndex = '5';
                    line.style.opacity = '0.7';
                    line.style.animation = 'water-prison-pulse 2s infinite';
                    
                    // 计算线长度和角度
                    const dx = targetRect.left + targetRect.width/2 - (sourceRect.left + sourceRect.width/2);
                    const dy = targetRect.top + targetRect.height/2 - (sourceRect.top + sourceRect.height/2);
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    
                    // 设置线的位置和变换
                    line.style.width = `${length}px`;
                    line.style.left = `${sourceRect.left + sourceRect.width/2}px`;
                    line.style.top = `${sourceRect.top + sourceRect.height/2}px`;
                    line.style.transformOrigin = '0 50%';
                    line.style.transform = `rotate(${angle}deg)`;
                    
                    // 添加到文档中
                    document.body.appendChild(line);
                    if (this.linkedAllies[sourceIndex]) {
                        this.linkedAllies[sourceIndex].lifeChainLine = line;
                    }
                }
            },
            handleAllyDeath: function(mageIndex) {
                // 当链接的盟友死亡时，寻找新盟友
                if (this.linkedAllies[mageIndex]) {
                    this.linkedAllies[mageIndex].linkedAllyIndex = null;
                    if (this.linkedAllies[mageIndex].lifeChainLine && this.linkedAllies[mageIndex].lifeChainLine.parentNode) {
                        this.linkedAllies[mageIndex].lifeChainLine.parentNode.removeChild(this.linkedAllies[mageIndex].lifeChainLine);
                        this.linkedAllies[mageIndex].lifeChainLine = null;
                    }
                    
                    const selfData = battleUnits.find(unit => unit.index === mageIndex);
                    if (selfData && selfData.unit.currentHP > 0) {
                        // 寻找新单位
                        this.findAndLinkNearestAlly(mageIndex, selfData.isEnemy);
                    }
                }
            },
            cleanupLifeChain: function() {
                // 战斗结束时清理所有链接
                for (const mageIndex in this.linkedAllies) {
                    if (this.linkedAllies[mageIndex].lifeChainLine && this.linkedAllies[mageIndex].lifeChainLine.parentNode) {
                        this.linkedAllies[mageIndex].lifeChainLine.parentNode.removeChild(this.linkedAllies[mageIndex].lifeChainLine);
                    }
                }
                // 重置链接信息
                this.linkedAllies = {};
            }
        }
    },

    // 消防员
    water: { 
        hp: 50, 
        attack: 5, 
        speed: 4,
        manaRegen: 50,
        color: '#4FC3F7', 
        icon: '💧',
        job: 'ranged',
        name: '消防员',
        inPool: 1,
        element: 'water',
        isTrap: false,
        skill: {
            type: 'active',
            name: '水流',
            description: '对同一列造成40%伤害',
            effect: (attacker, targets) => {
                return attacker.attack * 0.4;
            },
            // 执行水流技能
            executeWaterFlowSkill: (attackerUnit, target, attackerIndex, isEnemy) => {
                let damage = 0;
                const targetCol = target.index % 6;
                
                // 技能"补水"
                let enemyCount = 0;
                    for (let i = 0; i < battleUnits.length; i++) {
                        const potentialTarget = battleUnits[i];
                    if (potentialTarget.isEnemy !== isEnemy && potentialTarget.index % 6 === targetCol) {
                        enemyCount++;
                        // 获取消防员单位的基础属性
                        const baseStats = unitTypes.water;
                        damage = baseStats.skill.effect(attackerUnit, potentialTarget.unit);
                                    const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                        applyDamage(potentialTarget, damage, targetCell);
                    }
                }
                
                // 技能"补水"，在完成伤害后回复血量
                if (attackerUnit.level >= 2 && unitTypes.water.passiveSkills && unitTypes.water.passiveSkills.waterRefill) {
                    unitTypes.water.passiveSkills.waterRefill.heal(attackerUnit, enemyCount, attackerIndex);
                }
                
                return damage;
            }
        },
        passiveSkills: {
            waterRefill: {
                name: '补水',
                description: '水流回复血量',
                originalAttack: 0, 
                // 触发补水效果
                heal: (attacker, enemyCount, attackerIndex) => {
                    // 计算回复量
                    const healAmount = attacker.attack * enemyCount * 0.6;
                    
                    // 回复血量
                    attacker.currentHP = Math.min(attacker.maxHP, attacker.currentHP + healAmount);
                    
                    // 回血效果
                    const attackerCell = document.querySelector(`.grid-cell[data-index="${attackerIndex}"]`);
                    if (attackerCell) {
                        const healText = document.createElement('div');
                        healText.className = 'damage-number';
                        healText.textContent = `+${Math.round(healAmount)}`;
                        healText.style.color = '#4CAF50'; // 绿色
                        attackerCell.appendChild(healText);
                        
                        setTimeout(() => {
                            if (attackerCell.contains(healText)) {
                                attackerCell.removeChild(healText);
                            }
                        }, 1000);
                    }
                    
                    updateUnitDisplay(attackerIndex);
                    
                    return healAmount;
                }
            },
            solitude: {
                name: '孤身',
                description: '同列只有自己攻击力翻倍',
                originalAttack: 0, // 用于存储原始攻击力
                // 检查同列己方单位数量
                checkColumn: (unitIndex, isEnemy) => {
                    const unitCol = unitIndex % 6;
                    let allyCount = 0;
                    
                    // 遍历所有单位
                for (let i = 0; i < battleUnits.length; i++) {
                        const unit = battleUnits[i];
                        if (unit.isEnemy === isEnemy && unit.unit.currentHP > 0) {
                            const col = unit.index % 6;
                            if (col === unitCol) {
                                allyCount++;
                            }
                        }
                    }
                    
                    return allyCount;
                },
                // 攻击力加成
                applyBoost: (unit, unitData) => {
                    // 保存原始攻击力
                    if (unitTypes.water.passiveSkills.solitude.originalAttack === 0) {
                        unitTypes.water.passiveSkills.solitude.originalAttack = unit.attack;
                    }
                    
                    // 同列己方单位数量
                    const allyCount = unitTypes.water.passiveSkills.solitude.checkColumn(unitData.index, unitData.isEnemy);
                    
                    // 翻倍攻击力
                    if (allyCount === 1) {
                        unit.attack = unitTypes.water.passiveSkills.solitude.originalAttack * 2;
                    } else {
                        // 恢复原始攻击力
                        unit.attack = unitTypes.water.passiveSkills.solitude.originalAttack;
                    }
                    
                    updateUnitDisplay(unitData.index);
                },
                // 重置攻击力
                resetAttack: (unit) => {
                    if (unitTypes.water.passiveSkills.solitude.originalAttack > 0) {
                        unit.attack = unitTypes.water.passiveSkills.solitude.originalAttack;
                        unitTypes.water.passiveSkills.solitude.originalAttack = 0;
                    }
                }
            }
        }
    },

    // 潜水员
    waterDiver: { 
        hp: 4000, 
        attack: 10, 
        speed: 6, 
        manaRegen: 100, 
        color: '#4FC3F7', 
        icon: '🤿',
        job: 'assassin',
        name: '潜水员',
        inPool: 0,
        element: 'water',
        isTrap: false,
        skill: {
            type: 'active',
            name: '水牢',
            description: '造成50%的伤害，使其无法行动2回合',
            effect: (attacker, target) => {
                // 检查是否可以闪避负面效果
                if (typeof canDodge === 'function' && canDodge({unit: target, index: target.index})) {
                    // 闪避成功，不添加负面效果
                    return attacker.attack * 0.5; // 仍然造成伤害
                }
                
                // 检查电属性共鸣闪避效果
                const targetData = {unit: target, index: target.index};
                if (typeof canDodge === 'function' && canDodge(targetData, 'debuff')) {
                    // 闪避成功，不添加负面效果
                    return attacker.attack * 0.5; // 仍然造成伤害
                }
                
                // 添加无法行动状态
                if (!target.statusEffects) {
                    target.statusEffects = {};
                }
                target.statusEffects.cantAct = {
                    duration: 2,  // 持续2回合
                    startTurn: battleTurn  // 从当前回合开始计算
                };
                
                // 视觉效果
                const targetCell = document.querySelector(`.grid-cell[data-index="${target.index}"]`);
                if (targetCell) {
                    // 移除效果
                    const existingEffect = targetCell.querySelector('.water-prison-effect');
                    if (existingEffect) {
                        targetCell.removeChild(existingEffect);
                    }
                    
                    // 添加新水牢效果
                    const effectElement = createEffectElement('water-prison-effect');
                    targetCell.appendChild(effectElement);
                }
                
                // 施放水牢进入隐身状态
                if (attacker.level >= 3) {
                    // 是否隐身
                    let canActivateInvisibility = true;
                    let playerWaterDiverCount = 0;
                    let playerOtherUnitCount = 0;
                    let enemyWaterDiverCount = 0;
                    let enemyOtherUnitCount = 0;
                    
                    // 双方单位情况
                for (let i = 0; i < battleUnits.length; i++) {
                        const unit = battleUnits[i];
                        if (unit.unit.currentHP <= 0) continue; // 跳过已死亡单位
                        
                        if (unit.isEnemy) {
                            if (unit.unit.type === 'waterDiver' && unit.unit.level === 3) {
                                enemyWaterDiverCount++;
                            } else {
                                enemyOtherUnitCount++;
                            }
                        } else {
                            if (unit.unit.type === 'waterDiver' && unit.unit.level === 3) {
                                playerWaterDiverCount++;
                            } else {
                                playerOtherUnitCount++;
                            }
                        }
                    }
                    
                    // 双方都只剩下3级潜水员禁止隐身
                    if (playerWaterDiverCount > 0 && playerOtherUnitCount === 0 && 
                        enemyWaterDiverCount > 0 && enemyOtherUnitCount === 0) {
                        canActivateInvisibility = false;
                    }
                    
                    // 添加隐身状态
                    if (canActivateInvisibility) {
                        if (!attacker.statusEffects) {
                            attacker.statusEffects = {};
                        }
                        
                        // 持续2回合
                        attacker.statusEffects.invisible = {
                            duration: 2,  // 持续2回合
                            startTurn: battleTurn  // 从当前回合开始计算
                        };
                        
                        // 视觉效果
                        const attackerCell = document.querySelector(`.grid-cell[data-index="${attacker.index}"]`);
                        if (attackerCell) {
                            attackerCell.style.opacity = '0.5'; // 半透明效果表示隐身
                            
                            // 隐身效果提示
                            const invisibilityIndicator = createDamageNumber('隐身!', '#4FC3F7');
                            attackerCell.appendChild(invisibilityIndicator);
                            
                            setTimeout(() => {
                                if (attackerCell.contains(invisibilityIndicator)) {
                                    attackerCell.removeChild(invisibilityIndicator);
                                }
                            }, 1000);
                        }
                    }
                }
                
                return attacker.attack * 0.5;
            }
        },
        passiveSkills: {
            suffocation: {
                name: '窒息',
                description: '对"无法行动"单位造成300%的伤害',
            effect: (attacker, target) => {
                    // 是否无法行动
                    if (target.statusEffects && target.statusEffects.cantAct) {
                        return attacker.attack * 3; // 300%攻击力
                    }
                    return attacker.attack; // 正常攻击力
                }
            },
            diving: {
                name: '潜水',
                description: '隐身状态，无法选择作为攻击目标，持续2回合',
                removeInvisibility: (unit) => {
                    // 移除隐身
                    if (unit.statusEffects && unit.statusEffects.invisible) {
                        delete unit.statusEffects.invisible;
                        
                        // 恢复单位显示
                        const unitCell = document.querySelector(`.grid-cell[data-index="${unit.index}"]`);
                        if (unitCell) {
                            unitCell.style.opacity = '1';
                        }
                    }
                }
            }
        }
    },

    // 雷电术士
    electric: { 
        hp: 250, 
        attack: 5,
        speed: 8, 
        manaRegen: 100, 
        color: '#FFEB3B', 
        icon: '⚡',
        job: 'mage',
        name: '雷电术士',
        inPool: 0,
        element: 'electric',
        isTrap: false,
        passiveSkills: {
            energize: {
                name: '充能',
                description: '天雷技能每击中1名对方单位，回复20蓝量',
                unlockLevel: 2,
                effect: (attacker) => {
                    attacker.mana = Math.min(300, attacker.mana + 20);
                    
                    // 显示回蓝效果
                    const unitCell = document.querySelector(`.grid-cell[data-index="${attacker.index}"]`);
                    if (unitCell) {
                        const manaText = document.createElement('div');
                        manaText.className = 'damage-number';
                        manaText.textContent = '+20🔵';
                        manaText.style.color = '#4FC3F7'; // 蓝色
                        unitCell.appendChild(manaText);
                        
                        setTimeout(() => {
                            if (unitCell.contains(manaText)) {
                                unitCell.removeChild(manaText);
                            }
                        }, 1000);
                    }
                }
            },
            amplify: {
                name: '增幅',
                description: '每次释放天雷技能前，根据当前蓝量提升攻击力为当前攻击力*当前蓝量/100，技能结束后立即重置攻击力',
                unlockLevel: 3,
                originalAttack: 0,
                increaseAttack: (attacker) => {
                    // 首次激活时记录原始攻击力
                    if (unitTypes.electric.passiveSkills.amplify.originalAttack === 0) {
                        unitTypes.electric.passiveSkills.amplify.originalAttack = attacker.attack;
                        console.log('originalAttack:', unitTypes.electric.passiveSkills.amplify.originalAttack);
                    }
                    
                    // 根据当前蓝量提升攻击力
                    const multiplier = attacker.mana / 100;
                    const newAttack = Math.floor(unitTypes.electric.passiveSkills.amplify.originalAttack * (1 + multiplier));
                    const increase = newAttack - attacker.attack;
                    attacker.attack = newAttack;
                    // 显示效果
                    const unitCell = document.querySelector(`.grid-cell[data-index="${attacker.index}"]`);
                    if (unitCell) {
                        const attackText = document.createElement('div');
                        attackText.className = 'damage-number';
                        attackText.textContent = `+${increase}⚔️`;
                        attackText.style.color = '#FFEB3B'; // 黄色
                        unitCell.appendChild(attackText);
                        
                        setTimeout(() => {
                            if (unitCell.contains(attackText)) {
                                unitCell.removeChild(attackText);
                            }
                        }, 1000);
                    }
                },
                resetAttack: (attacker) => {
                    // 重置攻击力
                    if (unitTypes.electric.passiveSkills.amplify.originalAttack > 0) {
                        attacker.attack = unitTypes.electric.passiveSkills.amplify.originalAttack;
                    }
                }
            }
        },
        skill: {
            type: 'active',
            name: '天雷',
            description: '对随机1名单位造成200%伤害，命中率基于速度差值，重复发动5次',
            effect: (attacker, target) => {
                return attacker.attack * 2;
            },
            // 移除固定命中率，改为动态计算
            repeatTimes: 5,
            executeThunderAttack: (attackerUnit, attackerIndex, isEnemy) => {
                // 标记技能执行中
                isSkillExecuting = true;
                let damage = 0;
                
                // 3级解锁增幅技能：根据当前蓝量提升攻击力
                if (attackerUnit.level >= 3 && unitTypes.electric.passiveSkills.amplify) {
                    unitTypes.electric.passiveSkills.amplify.increaseAttack(attackerUnit);
                }
                
                const performThunderAttack = (attackIndex) => {
                    if (attackIndex >= unitTypes.electric.skill.repeatTimes) {
                        // 技能执行完毕，清除标志位
                        isSkillExecuting = false;
                        
                        // 3级解锁增幅技能：技能结束后重置攻击力
                        if (attackerUnit.level >= 3 && unitTypes.electric.passiveSkills.amplify) {
                            unitTypes.electric.passiveSkills.amplify.resetAttack(attackerUnit);
                        }
                        
                        return; // 结束递归
                    }
                    
                    // 随机选择一个敌人
                    const enemies = battleUnits.filter(unit => unit.isEnemy !== isEnemy && unit.unit.currentHP > 0);
                    if (enemies.length > 0) {
                        const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
                        const targetCell = document.querySelector(`.grid-cell[data-index="${randomEnemy.index}"]`);
                        
                        // 计算速度差值并确定命中率
                        let attackerSpeed = attackerUnit.speed;
                        let targetSpeed = randomEnemy.unit.speed;
                        
                        // 考虑临时速度修正
                        if (attackerUnit.tempSpeed !== undefined) {
                            attackerSpeed += attackerUnit.tempSpeed;
                        }
                        if (randomEnemy.unit.tempSpeed !== undefined) {
                            targetSpeed += randomEnemy.unit.tempSpeed;
                        }
                        
                        // 计算速度差值的绝对值
                        const speedDiff = Math.abs(attackerSpeed - targetSpeed);
                        // 计算命中率 = 速度差值/10，限制在0.1到0.9之间
                        const hitRate = Math.min(0.9, Math.max(0.1, speedDiff / 10));
                        
                        // 显示速度差值和命中率
                        const attackerCell = document.querySelector(`.grid-cell[data-index="${attackerIndex}"]`);
                        const infoText = document.createElement('div');
                        infoText.className = 'damage-number';
                        infoText.textContent = `速差:${speedDiff} 命中:${Math.round(hitRate * 100)}%`;
                        infoText.style.color = '#FFEB3B'; // 黄色
                        attackerCell.appendChild(infoText);
                        
                        setTimeout(() => {
                            if (attackerCell.contains(infoText)) {
                                attackerCell.removeChild(infoText);
                            }
                        }, 1000);
                        
                        // 根据计算的命中率判定是否命中
                        if (Math.random() < hitRate) {
                            // 命中，造成伤害
                            damage = unitTypes.electric.skill.effect(attackerUnit, randomEnemy.unit);
                            applyDamage(randomEnemy, damage, targetCell);
                            console.log(`${attackerUnit.type} 对 ${randomEnemy.unit.type} 造成 ${damage} 点伤害 (命中率: ${Math.round(hitRate * 100)}%)`);
                            // 2级解锁充能技能：每击中1名敌人回复20蓝量
                            if (attackerUnit.level >= 2 && unitTypes.electric.passiveSkills.energize) {
                                unitTypes.electric.passiveSkills.energize.effect(attackerUnit);
                            }
                        } else {
                            // 未命中，显示失败提示
                            const failText = document.createElement('div');
                            failText.className = 'damage-number';
                            failText.textContent = '失败';
                            failText.style.color = '#888';
                            attackerCell.appendChild(failText);

                            setTimeout(() => {
                                if (failText.parentNode === attackerCell) {
                                    attackerCell.removeChild(failText);
                                }
                            }, 1000);
                        }

                        setTimeout(() => {
                            performThunderAttack(attackIndex + 1);
                        }, 200);
                    } else {
                        console.log('天雷技能提前结束：没有存活的敌人');
                        isSkillExecuting = false;
                        
                        // 3级解锁增幅技能：技能提前结束也需要重置攻击力
                        if (attackerUnit.level >= 3 && unitTypes.electric.passiveSkills.amplify) {
                            unitTypes.electric.passiveSkills.amplify.resetAttack(attackerUnit);
                        }
                        
                        return;
                    }
                };
                
                // 开始第一次攻击
                performThunderAttack(0);
                
                return damage;
            }
        }
    },

    // 雷神
    electricThor: { 
        hp: 30, 
        attack: 10, 
        speed: 7, 
        manaRegen: 100, 
        color: '#FFEB3B', 
        icon: '🔨',
        job: 'warrior',
        name: '雷神',
        inPool: 0,
        element: 'electric',
        isTrap: false,
        passiveSkills: {
            staticElectricity: {
                name: '静电',
                description: '释放重锤时，对同行敌人造成50%伤害',
                unlockLevel: 2,
                effect: (attacker, target) => {
                    return attacker.attack * 0.5;
                }
            },
            rage: {
                name: '激怒',
                description: '每次受伤增加10攻击力，释放技能后重置',
                unlockLevel: 3,
                originalAttack: 0,
                increaseAttack: (unit) => {
                    // 首次激活时记录原始攻击力
                    if (unitTypes.electricThor.passiveSkills.rage.originalAttack === 0) {
                        unitTypes.electricThor.passiveSkills.rage.originalAttack = unit.attack;
                    }
                    // 增加攻击力
                    unit.attack += 10;
                    
                    // 显示效果
                    const unitCell = document.querySelector(`.grid-cell[data-index="${unit.index}"]`);
                    if (unitCell) {
                        const attackText = document.createElement('div');
                        attackText.className = 'damage-number';
                        attackText.textContent = '+10⚔️';
                        attackText.style.color = '#FFEB3B'; // 黄色
                        unitCell.appendChild(attackText);
                            
                            setTimeout(() => {
                            if (unitCell.contains(attackText)) {
                                unitCell.removeChild(attackText);
                                }
                            }, 1000);
                        }
                },
                resetAttack: (unit) => {
                    // 重置攻击力
                    if (unitTypes.electricThor.passiveSkills.rage.originalAttack > 0) {
                        unit.attack = unitTypes.electricThor.passiveSkills.rage.originalAttack;
                        }
                    }
                }
            },
        skill: {
            type: 'active',
            name: '重锤',
            description: '造成基于速度差值的伤害，并使目标无法行动2回合',
            effect: (attacker, target) => {
                // 计算速度差值并确定伤害倍率
                let attackerSpeed = attacker.speed;
                let targetSpeed = target.speed;
                
                // 考虑临时速度修正
                if (attacker.tempSpeed !== undefined) {
                    attackerSpeed += attacker.tempSpeed;
                }
                if (target.tempSpeed !== undefined) {
                    targetSpeed += target.tempSpeed;
                }
                
                // 计算速度差值的绝对值
                const speedDiff = Math.abs(attackerSpeed - targetSpeed);
                // 计算伤害倍率 = (1 + N/10)
                const damageMultiplier = 1 + speedDiff / 10;
                
                // 显示伤害倍率
                const attackerCell = document.querySelector(`.grid-cell[data-index="${attacker.index}"]`);
                if (attackerCell) {
                    const infoText = document.createElement('div');
                    infoText.className = 'damage-number';
                    infoText.textContent = `速差:${speedDiff} 倍率:${damageMultiplier.toFixed(1)}`;
                    infoText.style.color = '#FFEB3B'; // 黄色
                    attackerCell.appendChild(infoText);
                    
                    setTimeout(() => {
                        if (attackerCell.contains(infoText)) {
                            attackerCell.removeChild(infoText);
                        }
                    }, 1000);
                }
                
                // 检查电属性共鸣闪避效果
                const targetData = battleUnits.find(u => u.unit === target);
                if (typeof canDodge === 'function' && targetData && canDodge(targetData, 'debuff')) {
                    // 闪避成功，不添加负面效果
                    return attacker.attack * damageMultiplier; // 仍然造成伤害
                }
                
                // 添加无法行动
                if (!target.statusEffects) {
                    target.statusEffects = {};
                }
                target.statusEffects.cantAct = {
                    duration: 2,  // 持续2回合
                    startTurn: battleTurn  // 从当前回合开始计算
                };
                
                // 视觉效果
                const targetCell = document.querySelector(`.grid-cell[data-index="${target.index}"]`);
                    if (targetCell) {
                    // 移除已有效果
                    const existingEffect = targetCell.querySelector('.water-prison-effect');
                    if (existingEffect) {
                        targetCell.removeChild(existingEffect);
                    }
                    
                    // 添加新效果
                    const effectElement = createEffectElement('water-prison-effect');
                    targetCell.appendChild(effectElement);
                }
                
                return attacker.attack * damageMultiplier;
            },
            executeHammerSkill: (attackerUnit, target, targetCell, attackerData) => {
                // 雷神重锤技能执行
                let damage = unitTypes.electricThor.skill.effect(attackerUnit, target.unit);
                applyDamage(target, damage, targetCell, attackerData);
                
                // 2级解锁静电技能：对同行敌人造成额外伤害
                if (attackerUnit.level >= 2 && unitTypes.electricThor.passiveSkills.staticElectricity) {
                    const targetRow = Math.floor(target.index / 6);
                    const startIndex = targetRow * 6;
                    const endIndex = startIndex + 5;
                    
                    // 对同行的其他敌人造成伤害
                    for (let i = 0; i < battleUnits.length; i++) {
                        const potentialTarget = battleUnits[i];
                        // 跳过同阵营单位、已死亡单位和当前目标
                        if (potentialTarget.isEnemy === attackerData.isEnemy || 
                            potentialTarget.unit.currentHP <= 0 || 
                            potentialTarget.index === target.index) continue;
                        
                        // 检查是否在同一行
                        const potentialRow = Math.floor(potentialTarget.index / 6);
                        if (potentialRow === targetRow) {
                            // 造成额外伤害
                            const staticDamage = unitTypes.electricThor.passiveSkills.staticElectricity.effect(attackerUnit, potentialTarget.unit);
                            const damageTargetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                            applyDamage(potentialTarget, staticDamage, damageTargetCell, attackerData);
                        }
                    }
                }
                
                // 3级解锁激怒技能：释放技能后重置攻击力
                if (attackerUnit.level >= 3 && unitTypes.electricThor.passiveSkills.rage) {
                    unitTypes.electricThor.passiveSkills.rage.resetAttack(attackerUnit);
                    // 更新显示
                    updateUnitDisplay(attackerData.index);
                }
                
                return damage;
            }
        }
    },

    // 雷电侠
    electricFlash: { 
        hp: 300, 
        attack: 1, 
        speed: 9, 
        manaRegen: 100, 
        color: '#FFEB3B', 
        icon: '⚡',
        job: 'assassin',
        name: '雷电侠',
        inPool: 1,
        element: 'electric',
        isTrap: false,
        passiveSkills: {
            amplify: {
                name: '增幅',
                description: '释放闪击时，每次攻击有30%概率暴击，暴击时伤害翻倍',
                unlockLevel: 2,
                effect: (attacker) => {
                    return Math.random() < 0.3; // 30%概率返回true表示触发暴击
                }
            },
            shock: {
                name: '触电',
                description: '释放闪击且发生暴击时，额外对距攻击目标最近的1名对方单位造成当前攻击力50%的伤害',
                unlockLevel: 3,
                effect: (attacker, target) => {
                    return attacker.attack * 0.5; // 返回额外伤害值
                }
            }
        },
        skill: {
            type: 'active',
            name: '闪击',
            description: '根据速度差值连续造成多次50%伤害',
            effect: (attacker, target) => {
                return attacker.attack * 0.5;
            },
            executeFlashAttack: (attackerUnit, attackerIndex, isEnemy) => {
                // 标记技能执行中
                isSkillExecuting = true;
                let damage = 0;
                
                const performFlashAttack = (attackIndex, totalAttacks) => {
                    if (attackIndex >= totalAttacks) {
                        // 技能执行完毕清除标志位
                        isSkillExecuting = false;
                        return; // 结束递归
                    }
                    
                    // 寻找攻击目标
                    let currentTarget = findFarthestTarget(attackerIndex, isEnemy);
                    
                    if (currentTarget) {
                        const targetCell = document.querySelector(`.grid-cell[data-index="${currentTarget.index}"]`);
                        
                        // 计算基础伤害
                        damage = unitTypes.electricFlash.skill.effect(attackerUnit, currentTarget.unit);
                        
                        // 2级解锁增幅技能：30%概率暴击
                        let isCritical = false;
                        if (attackerUnit.level >= 2 && unitTypes.electricFlash.passiveSkills.amplify) {
                            isCritical = unitTypes.electricFlash.passiveSkills.amplify.effect(attackerUnit);
                            if (isCritical) {
                                // 暴击时伤害翻倍
                                damage *= 2;
                                
                                // 显示暴击效果
                                const attackerCell = document.querySelector(`.grid-cell[data-index="${attackerIndex}"]`);
                                if (attackerCell) {
                                    const critText = document.createElement('div');
                                    critText.className = 'damage-number';
                                    critText.textContent = '暴击!';
                                    critText.style.color = '#FFEB3B'; // 黄色
                                    attackerCell.appendChild(critText);
                                    
                                    setTimeout(() => {
                                        if (attackerCell.contains(critText)) {
                                            attackerCell.removeChild(critText);
                                        }
                                    }, 1000);
                                }
                            }
                        }
                        
                        // 造成伤害
                        const attackerData = battleUnits.find(unit => unit.index === attackerIndex);
                        applyDamage(currentTarget, damage, targetCell, attackerData);
                        
                        // 3级解锁触电技能：暴击时对最近的敌人造成额外伤害
                        if (isCritical && attackerUnit.level >= 3 && unitTypes.electricFlash.passiveSkills.shock) {
                            // 寻找距离当前目标最近的敌人
                            let nearestEnemy = null;
                            let minDistance = Infinity;
                            
                            for (let i = 0; i < battleUnits.length; i++) {
                                const potentialTarget = battleUnits[i];
                                // 跳过同阵营单位、已死亡单位和当前目标
                                if (potentialTarget.isEnemy === isEnemy || 
                                    potentialTarget.unit.currentHP <= 0 || 
                                    potentialTarget.index === currentTarget.index) continue;
                                
                                // 计算距离（简单使用行列差值）
                                const targetRow = Math.floor(currentTarget.index / 6);
                                const targetCol = currentTarget.index % 6;
                                const potentialRow = Math.floor(potentialTarget.index / 6);
                                const potentialCol = potentialTarget.index % 6;
                                
                                const distance = Math.abs(targetRow - potentialRow) + Math.abs(targetCol - potentialCol);
                                
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    nearestEnemy = potentialTarget;
                                }
                            }
                            
                            // 对最近的敌人造成额外伤害
                            if (nearestEnemy) {
                                const shockDamage = unitTypes.electricFlash.passiveSkills.shock.effect(attackerUnit, nearestEnemy.unit);
                                const shockTargetCell = document.querySelector(`.grid-cell[data-index="${nearestEnemy.index}"]`);
                                
                                // 显示触电效果
                                if (shockTargetCell) {
                                    const shockEffect = document.createElement('div');
                                    shockEffect.className = 'damage-number';
                                    shockEffect.textContent = '触电!';
                                    shockEffect.style.color = '#4FC3F7'; // 蓝色
                                    shockTargetCell.appendChild(shockEffect);
                    
                    setTimeout(() => {
                                        if (shockTargetCell.contains(shockEffect)) {
                                            shockTargetCell.removeChild(shockEffect);
                        }
                    }, 1000);
                                }
                                
                                applyDamage(nearestEnemy, shockDamage, shockTargetCell, attackerData);
                            }
                        }
                        
                        // 显示当前攻击次数/总攻击次数
                        const attackerCell = document.querySelector(`.grid-cell[data-index="${attackerIndex}"]`);
                        if (attackerCell) {
                            const attackCountText = document.createElement('div');
                            attackCountText.className = 'damage-number';
                            attackCountText.textContent = `闪击 ${attackIndex+1}/${totalAttacks}`;
                            attackCountText.style.color = '#FFEB3B'; // 黄色
                            attackerCell.appendChild(attackCountText);
                        
                        setTimeout(() => {
                                if (attackerCell.contains(attackCountText)) {
                                    attackerCell.removeChild(attackCountText);
                                }
                            }, 200);
                        }
                        
                        setTimeout(() => {
                            performFlashAttack(attackIndex + 1, totalAttacks);
                        }, 200);
                    } else {
                        console.log('闪击技能提前结束：没有存活的敌人');
                        isSkillExecuting = false;
                        return;
                    }
                };
                
                // 寻找攻击目标，计算速度差值
                const target = findFarthestTarget(attackerIndex, isEnemy);
                
                if (target) {
                    // 获取雷电侠和目标的速度
                    const attackerSpeed = attackerUnit.tempSpeed !== undefined ? attackerUnit.tempSpeed : attackerUnit.speed;
                    let targetSpeed = target.unit.speed;
                    
                    // 考虑目标可能的临时速度修正
                    if (target.unit.tempSpeed !== undefined) {
                        targetSpeed = target.unit.tempSpeed;
                    }
                    
                    // 计算速度差值，并确保至少有2次攻击
                    const speedDiff = Math.max(2, Math.abs(attackerSpeed - targetSpeed));
                    
                    // 显示速度差值和攻击次数
                    const attackerCell = document.querySelector(`.grid-cell[data-index="${attackerIndex}"]`);
                    if (attackerCell) {
                        const speedDiffText = document.createElement('div');
                        speedDiffText.className = 'damage-number';
                        speedDiffText.textContent = `速度差: ${speedDiff}`;
                        speedDiffText.style.color = '#FFEB3B'; // 黄色
                        attackerCell.appendChild(speedDiffText);
                        
                        setTimeout(() => {
                            if (attackerCell.contains(speedDiffText)) {
                                attackerCell.removeChild(speedDiffText);
                            }
                        }, 1000);
                    }
                    
                    console.log(`雷电侠闪击: 速度差 ${speedDiff}，发动 ${speedDiff} 次攻击`);
                    
                    // 开始第一次攻击，传入总攻击次数
                    performFlashAttack(0, speedDiff);
                } else {
                    console.log('闪击技能无法执行：没有找到目标');
                    isSkillExecuting = false;
                }
                
                return damage;
            }
        }
    },

    // 盗贼
    earth: { 
        hp: 2000, 
        attack: 5, 
        speed: 5, 
        manaRegen: 0, 
        color: '#8D6E63', 
        icon: '🌑',
        job: 'assassin',
        name: '盗贼',
        inPool: 0,
        element: 'earth',
        isTrap: false,
        skill: {
            type: 'passive',
            name: '偷钱',
            description: '普攻50%概率获得1枚贝壳',
            effect: (isEnemy = false) => {
                if (Math.random() < 0.5) {
                    if (!isEnemy) {
                        gameState.player.shells += 1;
                    } else {
                        // 敌方盗贼偷钱成功时减少玩家贝壳
                        gameState.player.shells = Math.max(0, gameState.player.shells - 1);
                    }
                    return true;
                }
                return false;
            }
        },
        passiveSkills: {
            purchase: {
                name: '购置',
                description: '每次偷钱成功时，攻击力+1',
                unlockLevel: 2,
                attackBonus: 0, // 记录当前战斗中累积的攻击力加成
                effect: (unit) => {
                    unit.attack += 1;
                    unit.purchaseBonus = (unit.purchaseBonus || 0) + 1;
                },
                reset: (unit) => {
                    if (unit.purchaseBonus) {
                        unit.attack -= unit.purchaseBonus;
                        unit.purchaseBonus = 0;
                    }
                }
            },
            survival: {
                name: '苟活',
                description: '战斗结束后每存活1名我方盗贼奖励10贝壳，每存活1名敌方盗贼扣除10贝壳',
                unlockLevel: 3,
                effect: (playerThieves, enemyThieves) => {
                    const shellsGain = playerThieves * 10;
                    const shellsLoss = enemyThieves * 10;
                    const netChange = shellsGain - shellsLoss;
                    gameState.player.shells = Math.max(0, gameState.player.shells + netChange);
                    return netChange;
                }
            }
        }
    },

    // 傀儡师
    earthPup: {
        hp: 50,
        attack: 0,
        speed: 1,
        manaRegen: 0,
        color: '#8D6E63',
        icon: '🎭',
        job: 'support',
        name: '傀儡师',
        inPool: 0,
        element: 'earth',
        isTrap: false,
        // 添加被动技能
        passiveSkills: {
            substitute: {
                name: '替身',
                description: '自身复制的傀儡存活期间，傀儡师受到的伤害将由傀儡全部承担',
                unlockLevel: 2,
                effect: (puppetMasterData, damage) => {
                    // 获取傀儡索引
                    const puppetIndex = unitTypes.earthPup.skill.puppets[puppetMasterData.index];
                    if (puppetIndex === undefined) return damage; // 没有傀儡，正常承受伤害
                    
                    // 获取傀儡数据
                    const puppetUnit = gameState.units.battleField[puppetIndex];
                    if (!puppetUnit || puppetUnit.currentHP <= 0) return damage; // 傀儡不存在或已死亡
                    
                    // 傀儡承担伤害
                    const puppetData = battleUnits.find(unit => unit.index === puppetIndex);
                    if (puppetData) {
                        const puppetCell = document.querySelector(`.grid-cell[data-index="${puppetIndex}"]`);
                        if (puppetCell) {
                            // 显示替身效果
                            const substituteEffect = document.createElement('div');
                            substituteEffect.className = 'damage-number';
                            substituteEffect.style.color = '#8D6E63'; // 土色
                            substituteEffect.textContent = '替身!';
                            puppetCell.appendChild(substituteEffect);
                            
                            setTimeout(() => {
                                if (puppetCell.contains(substituteEffect)) {
                                    puppetCell.removeChild(substituteEffect);
                                }
                            }, 1000);
                            
                            // 对傀儡应用伤害
                            applyDamage(puppetData, damage, puppetCell);
                            
                            // 傀儡师不受伤害
                            return 0;
                        }
                    }
                    return damage; // 默认情况下正常承受伤害
                }
            },
            trap: {
                name: '陷阱',
                description: '自身复制的傀儡死亡时，立即对同一列所有对方单位造成当前傀儡师剩余血量100%的伤害',
                unlockLevel: 3,
                effect: (puppetMasterData, puppetIndex) => {
                    // 获取傀儡所在列
                    const puppetCol = puppetIndex % 6;
                    
                    // 获取傀儡师当前血量
                    const puppetMasterHP = puppetMasterData.unit.currentHP;
                    
                    // 寻找同列的敌方单位
                    const enemyUnits = battleUnits.filter(unitData => {
                        return unitData.isEnemy !== puppetMasterData.isEnemy && 
                               unitData.unit.currentHP > 0 && 
                               unitData.index % 6 === puppetCol;
                    });
                    
                    // 对每个敌方单位造成伤害
                    for (const enemyData of enemyUnits) {
                        const enemyCell = document.querySelector(`.grid-cell[data-index="${enemyData.index}"]`);
                        if (enemyCell) {
                            // 显示陷阱效果
                            const trapEffect = document.createElement('div');
                            trapEffect.className = 'damage-number';
                            trapEffect.style.color = '#8D6E63'; // 土色
                            trapEffect.textContent = '陷阱!';
                            enemyCell.appendChild(trapEffect);
                            
                            setTimeout(() => {
                                if (enemyCell.contains(trapEffect)) {
                                    enemyCell.removeChild(trapEffect);
                                }
                            }, 1000);
                            
                            // 应用伤害
                            applyDamage(enemyData, puppetMasterHP, enemyCell, puppetMasterData);
                        }
                    }
                }
            }
        },
        skill: {
            type: 'passive',
            name: '傀儡',
            description: '随机复制一名对方单位为己方傀儡',
            puppets: {}, // 存储傀儡
            puppetMasters: {}, // 存储傀儡师
            createPuppet: function(puppetMasterData) {
                // 获取对方单位列表（排除傀儡师、傀儡和机关单位）
                const enemyUnits = battleUnits.filter(unitData => {
                    return unitData.isEnemy !== puppetMasterData.isEnemy && 
                           unitData.unit.type !== 'earthPup' &&
                           !unitData.unit.isPuppet &&
                           !unitData.unit.isTrap && // 排除机关单位
                           unitData.unit.currentHP > 0;
                });
                
                if (enemyUnits.length === 0) {
                    console.log('没有可复制单位');
                    return; 
                }
                
                // 随机选择一个敌方单位
                const randomIndex = Math.floor(Math.random() * enemyUnits.length);
                const targetUnitData = enemyUnits[randomIndex];
                
                // 寻找空闲的格子放置傀儡
                let emptyCell = -1;
                const puppetMasterCol = puppetMasterData.index % 6; // 获取傀儡师所在列

                if (puppetMasterData.isEnemy) {
                    // 敌方傀儡师，优先在同列最下方找空格子
                    for (let row = 3; row >= 0; row--) { 
                        const cellIndex = row * 6 + puppetMasterCol;
                        if (gameState.units.battleField[cellIndex] === null) {
                            emptyCell = cellIndex;
                            break;
                        }
                    }
                    
                    // 如果同列没有空位，检查相邻列
                    if (emptyCell === -1) {
                        let leftCol = puppetMasterCol - 1;
                        let rightCol = puppetMasterCol + 1;
                        while (emptyCell === -1 && (leftCol >= 0 || rightCol < 6)) {
                            if (leftCol >= 0) {
                                for (let row = 3; row >= 0; row--) {
                                    const cellIndex = row * 6 + leftCol;
                                    if (gameState.units.battleField[cellIndex] === null) {
                                        emptyCell = cellIndex;
                                        break;
                                    }
                                }
                            }
                            if (emptyCell === -1 && rightCol < 6) {
                                for (let row = 3; row >= 0; row--) {
                                    const cellIndex = row * 6 + rightCol;
                                    if (gameState.units.battleField[cellIndex] === null) {
                                        emptyCell = cellIndex;
                                        break;
                                    }
                                }
                            }
                            leftCol--;
                            rightCol++;
                        }
                    }
                } else {
                    for (let row = 4; row < 8; row++) {
                        const cellIndex = row * 6 + puppetMasterCol;
                        if (gameState.units.battleField[cellIndex] === null) {
                            emptyCell = cellIndex;
                            break;
                        }
                    }
                    if (emptyCell === -1) {
                        let leftCol = puppetMasterCol - 1;
                        let rightCol = puppetMasterCol + 1;
                        while (emptyCell === -1 && (leftCol >= 0 || rightCol < 6)) {
                            if (leftCol >= 0) {
                                for (let row = 4; row < 8; row++) {
                                    const cellIndex = row * 6 + leftCol;
                                    if (gameState.units.battleField[cellIndex] === null) {
                                        emptyCell = cellIndex;
                                        break;
                                    }
                                }
                            }
                            if (emptyCell === -1 && rightCol < 6) {
                                for (let row = 4; row < 8; row++) {
                                    const cellIndex = row * 6 + rightCol;
                                    if (gameState.units.battleField[cellIndex] === null) {
                                        emptyCell = cellIndex;
                                        break;
                                    }
                                }
                            }
                            leftCol--;
                            rightCol++;
                        }
                    }
                }
                
                if (emptyCell === -1) {
                    console.log('无法放置傀儡');
                    return; 
                }
                
                // 复制单位
                const originalUnit = targetUnitData.unit;
                const puppetUnit = {
                    type: originalUnit.type,
                    level: originalUnit.level,
                    currentHP: Math.round(originalUnit.currentHP * 0.5),
                    maxHP: Math.round(originalUnit.maxHP * 0.5),
                    attack: Math.round(originalUnit.attack * 0.5),
                    mana: 0,
                    isPuppet: true, // 标记傀儡
                    originalType: originalUnit.type // 保存原始类型
                };
                
                // 放置傀儡
                gameState.units.battleField[emptyCell] = puppetUnit;
                
                // 记录傀儡与傀儡师关系
                this.puppets[puppetMasterData.index] = emptyCell;
                this.puppetMasters[emptyCell] = puppetMasterData.index;
                
                // 更新战场
                const cell = document.querySelector(`.grid-cell[data-index="${emptyCell}"]`);
                if (cell) {
                    cell.innerHTML = '';
                    cell.style.backgroundColor = unitTypes[puppetUnit.type].color;
                    
                    // 添加血量显示
                    const hpElement = document.createElement('div');
                    hpElement.className = 'unit-hp';
                    hpElement.innerHTML = `❤️${puppetUnit.currentHP}`;
                    cell.appendChild(hpElement);
                    
                    // 添加攻击力显示
                    const attackElement = document.createElement('div');
                    attackElement.className = 'unit-attack';
                    attackElement.innerHTML = `${unitTypes[puppetUnit.type].icon}${puppetUnit.attack}`;
                    cell.appendChild(attackElement);
                    
                    // 添加等级显示
                    const levelElement = document.createElement('div');
                    levelElement.className = 'unit-level';
                    levelElement.innerHTML = `Lv.${puppetUnit.level}`;
                    cell.appendChild(levelElement);
                    
                    // 添加傀儡标记
                    const puppetElement = document.createElement('div');
                    puppetElement.className = 'unit-puppet';
                    puppetElement.style.position = 'absolute';
                    puppetElement.style.top = '50%';
                    puppetElement.style.left = '50%';
                    puppetElement.style.transform = 'translate(-50%, -50%)';
                    puppetElement.style.fontSize = '20px';
                    puppetElement.style.opacity = '0.5';
                    puppetElement.textContent = '🎭';
                    cell.appendChild(puppetElement);
                }
                
                // 将傀儡添加到战斗单位列表
                battleUnits.push({
                    unit: puppetUnit,
                    index: emptyCell,
                    isEnemy: puppetMasterData.isEnemy,
                    hasAttacked: false
                });
                
                // 如果是水魔法师傀儡，初始化生命锁链技能
                if (puppetUnit.type === 'waterMage' && unitTypes.waterMage && unitTypes.waterMage.skill) {
                    unitTypes.waterMage.skill.effect(puppetUnit, emptyCell);
                    console.log(`水魔法师傀儡(${emptyCell})的生命锁链技能已初始化`);
                }
                
                console.log(`傀儡师(${puppetMasterData.index})创建了傀儡(${emptyCell})，复制了单位类型: ${puppetUnit.type}`);
            },
            removePuppet: function(puppetMasterIndex) {
                // 获取傀儡索引
                const puppetIndex = this.puppets[puppetMasterIndex];
                if (puppetIndex === undefined) return;
                
                // 从战场上移除傀儡
                gameState.units.battleField[puppetIndex] = null;
                
                // 从战斗单位列表中移除
                const index = battleUnits.findIndex(unit => unit.index === puppetIndex);
                if (index !== -1) {
                    battleUnits.splice(index, 1);
                }
                
                // 更新战场显示
                const cell = document.querySelector(`.grid-cell[data-index="${puppetIndex}"]`);
                if (cell) {
                    cell.innerHTML = '';
                    cell.style.backgroundColor = puppetIndex < 24 ? 'rgba(255, 82, 82, 0.1)' : 'rgba(79, 195, 247, 0.1)';
                }
                
                // 清除记录
                delete this.puppetMasters[puppetIndex];
                delete this.puppets[puppetMasterIndex];
                
                console.log(`傀儡师(${puppetMasterIndex})的傀儡(${puppetIndex})被移除`);
            },
            cleanupAllPuppets: function() {
                // 复制一份puppets对象的键，因为在循环中会修改原对象
                const puppetMasterIndices = Object.keys(this.puppets);
                
                // 移除所有傀儡
                for (const puppetMasterIndex of puppetMasterIndices) {
                    this.removePuppet(parseInt(puppetMasterIndex));
                }
                
                // 重置记录
                this.puppets = {};
                this.puppetMasters = {};
                
                console.log('所有傀儡已清除');
            }
        }
    },

    // 防卫者
    earthGuardian: {
        hp: 150,
        attack: 5,
        speed: 4,
        manaRegen: 10,
        color: '#8D6E63',
        icon: '🛡️',
        job: 'warrior',
        name: '防卫者',
        inPool: 0,
        element: 'earth',
        isTrap: false,
        // 被动技能
        passiveSkills: {
            // 2级解锁被动技能：反伤
            damageReflection: {
                name: '反伤',
                description: '当自身护盾值大于0时，受到伤害的50%将回敬给攻击者',
                unlockLevel: 2,
                effect: (defender, attacker, damage) => {
                    // 计算反伤伤害
                    const reflectDamage = Math.round(damage * 0.5);
                    return reflectDamage;
                }
            },
            // 3级解锁被动技能：减速
            slowdown: {
                name: '减速',
                description: '当自身护盾值大于0时，若对方单位对防卫者发动普攻或技能并造成了护盾值的消耗，立即使攻击者的速度-1',
                unlockLevel: 3,
                // 存储被减速的单位信息 {unitIndex: {originalSpeed: number, hasActed: boolean}}
                slowedUnits: {},
                // 减速效果
                applySlowdown: (attacker, attackerData) => {
                    // 获取攻击者的原始速度
                    const attackerUnit = attackerData.unit;
                    const originalSpeed = attackerUnit.speed;
                    
                    // 记录原始速度并应用减速
                    if (!unitTypes.earthGuardian.passiveSkills.slowdown.slowedUnits[attackerData.index]) {
                        unitTypes.earthGuardian.passiveSkills.slowdown.slowedUnits[attackerData.index] = {
                            originalSpeed: originalSpeed,
                            hasActed: false
                        };
                        
                        // 减速效果
                        attackerUnit.tempSpeed = originalSpeed - 1;
                        console.log(`${attackerUnit.type} 被减速，速度从 ${originalSpeed} 降低到 ${attackerUnit.tempSpeed}`);
                    }
                },
                // 重置速度
                resetSpeed: (attackerData) => {
                    const attackerUnit = attackerData.unit;
                    const slowedUnitInfo = unitTypes.earthGuardian.passiveSkills.slowdown.slowedUnits[attackerData.index];
                    
                    if (slowedUnitInfo) {
                        // 重置速度
                        delete attackerUnit.tempSpeed;
                        console.log(`${attackerUnit.type} 速度恢复到 ${slowedUnitInfo.originalSpeed}`);
                        
                        // 移除记录
                        delete unitTypes.earthGuardian.passiveSkills.slowdown.slowedUnits[attackerData.index];
                    }
                },
                // 清理所有减速效果
                cleanupSlowdown: () => {
                    unitTypes.earthGuardian.passiveSkills.slowdown.slowedUnits = {};
                }
            }
        },
        skill: {
            type: 'active',
            name: '护盾',
            description: '添加30%血量护盾',
            shieldAmount: {},  // 存储每个防卫者的护盾值，格式为 {battleIndex: shieldValue}
            effect: function(attacker) {
                // 计算护盾值为初始血量的3%
                const shieldValue = Math.round(unitTypes.earthGuardian.hp * 0.06);
                console.log('护盾值：', shieldValue);
                // 如果已有护盾，则叠加护盾值
                if (this.shieldAmount[attacker.index]) {
                    this.shieldAmount[attacker.index] += shieldValue;
                } else {
                    this.shieldAmount[attacker.index] = shieldValue;
                }
                
                // 更新护盾显示
                this.updateShieldDisplay(attacker.index);
                
                return 0; // 不造成伤害
            },
            updateShieldDisplay: function(unitIndex) {
                const cell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
                if (!cell) return;
                
                // 移除已有的护盾显示（如果有）
                const existingShield = cell.querySelector('.unit-shield');
                if (existingShield) {
                    cell.removeChild(existingShield);
                }
                
                // 如果有护盾值，添加护盾显示
                if (this.shieldAmount[unitIndex] && this.shieldAmount[unitIndex] > 0) {
                    const shieldElement = document.createElement('div');
                    shieldElement.className = 'unit-shield';
                    shieldElement.style.position = 'absolute';
                    shieldElement.style.top = '20px';
                    shieldElement.style.left = '2px';
                    shieldElement.style.fontSize = '10px';
                    shieldElement.style.color = '#8D6E63';
                    shieldElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
                    shieldElement.style.padding = '2px';
                    shieldElement.style.borderRadius = '3px';
                    shieldElement.style.zIndex = '5';
                    shieldElement.textContent = `🛡️${this.shieldAmount[unitIndex]}`;
                    cell.appendChild(shieldElement);
                }
            },
            clearShield: function(unitIndex) {
                // 清除护盾值
                if (this.shieldAmount[unitIndex]) {
                    delete this.shieldAmount[unitIndex];
                }
                
                // 移除护盾显示
                const cell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
                if (cell) {
                    const shieldElement = cell.querySelector('.unit-shield');
                    if (shieldElement) {
                        cell.removeChild(shieldElement);
                    }
                }
            },
            cleanupShields: function() {
                // 战斗结束时清理所有护盾
                for (const unitIndex in this.shieldAmount) {
                    this.clearShield(unitIndex);
                }
                // 重置护盾信息
                this.shieldAmount = {};
            }
        }
    },

    // 生化员
    grassBiochemist: {
        hp: 1000,
        attack: 5,
        speed: 4,
        manaRegen: 20,
        color: '#66BB6A',
        icon: '🧪',
        job: 'ranged',
        name: '生化员',
        inPool: 0,
        element: 'grass',
        isTrap: false,
        passiveSkills: {
            fatigue: {
                name: '疲倦',
                description: '所有携带"中毒"印记的对方单位，战斗中每个回合结束扣血的同时，蓝量-10',
                unlockLevel: 2,
                effect: (target) => {
                    // 减少目标蓝量
                    if (target.mana >= 10) {
                        target.mana -= 10;
                    } else {
                        target.mana = 0;
                    }
                    
                    // 显示蓝量减少效果
                    const targetCell = document.querySelector(`.grid-cell[data-index="${battleUnits.find(u => u.unit === target).index}"]`);
                    if (targetCell) {
                        const manaText = document.createElement('div');
                        manaText.className = 'damage-number';
                        manaText.style.color = '#4FC3F7'; // 蓝色
                        manaText.textContent = '-10🔵';
                        targetCell.appendChild(manaText);
                        
                        setTimeout(() => {
                            if (targetCell.contains(manaText)) {
                                targetCell.removeChild(manaText);
                            }
                        }, 1000);
                    }
                }
            },
            infection: {
                name: '传染',
                description: '所有携带"中毒"印记的对方单位死亡后，将"中毒"状态转移至任一"未中毒"的己方单位上，"中毒"回合数重置为3',
                unlockLevel: 3,
                effect: (deadUnit, deadUnitIndex) => {
                    // 查找未中毒的己方单位
                    const isEnemy = battleUnits.find(u => u.index === deadUnitIndex).isEnemy;
                    const aliveAllies = battleUnits.filter(unitData => 
                        unitData.isEnemy === isEnemy && 
                        unitData.unit.currentHP > 0 && 
                        (!unitData.unit.statusEffects || !unitData.unit.statusEffects.poisoned)
                    );
                    
                    if (aliveAllies.length === 0) {
                        return; // 没有可传染的目标
                    }
                    
                    // 随机选择一个目标
                    const targetData = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
                    const target = targetData.unit;
                    
                    // 添加中毒效果
                    if (!target.statusEffects) {
                        target.statusEffects = {};
                    }
                    
                    // 检查目标是否有无敌状态
                    if (target.statusEffects.invincible) {
                        // 触发无敌效果抵消负面效果
                        const targetCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                        if (targetCell) {
                            // 显示无敌触发效果
                            const invincibleTrigger = document.createElement('div');
                            invincibleTrigger.className = 'damage-number';
                            invincibleTrigger.style.color = '#FFD700'; // 金色
                            invincibleTrigger.style.fontSize = '16px';
                            invincibleTrigger.textContent = '无敌抵挡!';
                            targetCell.appendChild(invincibleTrigger);
                            
                            setTimeout(() => {
                                if (targetCell.contains(invincibleTrigger)) {
                                    targetCell.removeChild(invincibleTrigger);
                                }
                            }, 1500);
                            
                            // 移除无敌状态和视觉效果
                            delete target.statusEffects.invincible;
                            
                            const invincibleEffect = targetCell.querySelector('.invincible-effect');
                            if (invincibleEffect) {
                                targetCell.removeChild(invincibleEffect);
                            }
                            
                            // 显示传染效果（虽然无敌抵挡了中毒效果，但传染效果仍然显示）
                            const infectionText = document.createElement('div');
                            infectionText.className = 'damage-number';
                            infectionText.style.color = '#66BB6A'; // 绿色
                            infectionText.textContent = '传染抵挡!';
                            targetCell.appendChild(infectionText);
                            
                            setTimeout(() => {
                                if (targetCell.contains(infectionText)) {
                                    targetCell.removeChild(infectionText);
                                }
                            }, 1000);
                        }
                        
                        return; // 不添加中毒效果
                    }
                    
                    // 检查电属性共鸣闪避效果
                    if (typeof canDodge === 'function' && canDodge(targetData, 'debuff')) {
                        // 闪避成功，不施加中毒效果
                        // 显示传染效果被闪避
                        const targetCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                        if (targetCell) {
                            const dodgeText = document.createElement('div');
                            dodgeText.className = 'damage-number';
                            dodgeText.style.color = '#66BB6A'; // 绿色
                            dodgeText.textContent = '闪避传染!';
                            targetCell.appendChild(dodgeText);
                            
                            setTimeout(() => {
                                if (targetCell.contains(dodgeText)) {
                                    targetCell.removeChild(dodgeText);
                                }
                            }, 1000);
                        }
                        return; // 不添加中毒效果
                    }
                    
                    target.statusEffects.poisoned = {
                        startTurn: battleTurn,
                        duration: 3,
                        damage: Math.ceil(target.maxHP * 0.05),
                        source: deadUnit.statusEffects.poisoned.source // 保持原来的来源
                    };
                    
                    // 添加视觉效果
                    const targetCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                    if (targetCell) {
                        const poisonEffect = createEffectElement('poison-effect');
                        targetCell.appendChild(poisonEffect);
                        
                        // 显示传染效果
                        const infectionText = createDamageNumber('传染!', '#66BB6A');
                        targetCell.appendChild(infectionText);
                        
                        setTimeout(() => {
                            if (targetCell.contains(infectionText)) {
                                targetCell.removeChild(infectionText);
                            }
                        }, 1000);
                    }
                }
            }
        },
        skill: {
            type: 'active',
            name: '病毒',
            description: '造成100%伤害并施加"中毒"印记，每回合损失5%血量，持续3回合',
            effect: (attacker, target) => {
                // 检查目标是否中毒
                if (target.statusEffects && target.statusEffects.poisoned) {
                    return attacker.attack; // 如果已中毒，只造成普通伤害
                }
                
                // 添加中毒效果
                if (!target.statusEffects) {
                    target.statusEffects = {};
                }
                
                // 检查目标是否有无敌状态
                if (target.statusEffects.invincible) {
                    // 触发无敌效果抵消负面效果
                    const targetCell = document.querySelector(`.grid-cell[data-index="${battleUnits.find(u => u.unit === target).index}"]`);
                    if (targetCell) {
                        // 显示无敌触发效果
                        const invincibleTrigger = document.createElement('div');
                        invincibleTrigger.className = 'damage-number';
                        invincibleTrigger.style.color = '#FFD700'; // 金色
                        invincibleTrigger.style.fontSize = '16px';
                        invincibleTrigger.textContent = '无敌抵挡!';
                        targetCell.appendChild(invincibleTrigger);
                        
                        setTimeout(() => {
                            if (targetCell.contains(invincibleTrigger)) {
                                targetCell.removeChild(invincibleTrigger);
                            }
                        }, 1500);
                        
                        // 移除无敌状态和视觉效果
                        delete target.statusEffects.invincible;
                        
                        const invincibleEffect = targetCell.querySelector('.invincible-effect');
                        if (invincibleEffect) {
                            targetCell.removeChild(invincibleEffect);
                        }
                    }
                    
                    return attacker.attack; // 仍然造成普通伤害，但不施加中毒
                }
                
                // 检查电属性共鸣闪避效果
                const targetData = battleUnits.find(u => u.unit === target);
                if (typeof canDodge === 'function' && targetData && canDodge(targetData, 'debuff')) {
                    // 闪避成功，不施加中毒效果
                    return attacker.attack; // 仍然造成普通伤害，但不施加中毒
                }
                
                target.statusEffects.poisoned = {
                    startTurn: battleTurn,
                    duration: 3,
                    damage: Math.ceil(target.maxHP * 0.05),
                    source: attacker
                };
                
                // 添加视觉效果
                const targetCell = document.querySelector(`.grid-cell[data-index="${battleUnits.find(u => u.unit === target).index}"]`);
                if (targetCell) {
                    const poisonEffect = createEffectElement('poison-effect');
                    targetCell.appendChild(poisonEffect);
                    
                    // 显示传染效果
                    const infectionText = createDamageNumber('传染!', '#66BB6A');
                    targetCell.appendChild(infectionText);
                    
                    setTimeout(() => {
                        if (targetCell.contains(infectionText)) {
                            targetCell.removeChild(infectionText);
                        }
                    }, 1000);
                }
                
                return attacker.attack; // 造成普通伤害
            }
        }
    },

    // 修女
    grassNun: {
        hp: 80,
        attack: 100,
        speed: 3,
        manaRegen: 1,
        color: '#66BB6A',
        icon: '✝️',
        job: 'mage',
        name: '修女',
        inPool: 0,
        element: 'grass',
        isTrap: false,
        // 添加被动技能
        passiveSkills: {
            purify: {
                name: '净化',
                description: '主动技能给己方单位回血的同时，移除回血目标携带的所有负面效果',
                unlockLevel: 2,
                effect: (target) => {
                    // 移除目标的所有负面效果
                    if (target.statusEffects) {
                        // 检查并移除无法行动状态
                        if (target.statusEffects.stunned) {
                            delete target.statusEffects.stunned;
                            // 移除视觉效果
                            const targetIndex = battleUnits.find(u => u.unit === target).index;
                            const targetCell = document.querySelector(`.grid-cell[data-index="${targetIndex}"]`);
                            if (targetCell) {
                                const stunEffect = targetCell.querySelector('.stun-effect');
                                if (stunEffect) {
                                    targetCell.removeChild(stunEffect);
                                }
                            }
                        }
                        
                        // 检查并移除中毒状态
                        if (target.statusEffects.poisoned) {
                            delete target.statusEffects.poisoned;
                            // 移除视觉效果
                            const targetIndex = battleUnits.find(u => u.unit === target).index;
                            const targetCell = document.querySelector(`.grid-cell[data-index="${targetIndex}"]`);
                            if (targetCell) {
                                const poisonEffect = targetCell.querySelector('.poison-effect');
                                if (poisonEffect) {
                                    targetCell.removeChild(poisonEffect);
                                }
                            }
                        }
                        
                        // 显示净化效果
                        const targetIndex = battleUnits.find(u => u.unit === target).index;
                        const targetCell = document.querySelector(`.grid-cell[data-index="${targetIndex}"]`);
                        if (targetCell) {
                            const purifyEffect = document.createElement('div');
                            purifyEffect.className = 'damage-number';
                            purifyEffect.style.color = '#FFFFFF'; // 白色
                            purifyEffect.textContent = '净化!';
                            targetCell.appendChild(purifyEffect);
                            
                            setTimeout(() => {
                                if (targetCell.contains(purifyEffect)) {
                                    targetCell.removeChild(purifyEffect);
                                }
                            }, 1000);
                        }
                    }
                }
            },
            resurrection: {
                name: '复活',
                description: '记录战斗中己方死亡的第一个单位，在其血量首次小于0时，立即回复50%初始血量',
                unlockLevel: 3,
                hasResurrected: false, // 标记是否已经使用过复活技能
                firstDeadAlly: null, // 记录第一个死亡的己方单位
                effect: (deadUnit, deadUnitData) => {
                    // 检查是否已经使用过复活技能
                    if (unitTypes.grassNun.passiveSkills.resurrection.hasResurrected) {
                        return false; // 已经使用过复活技能，不再触发
                    }
                    
                    // 记录第一个死亡的己方单位
                    unitTypes.grassNun.passiveSkills.resurrection.firstDeadAlly = deadUnit;
                    
                    // 复活单位，恢复50%初始血量
                    deadUnit.currentHP = Math.ceil(deadUnit.maxHP * 0.5);
                    
                    // 标记已使用复活技能
                    unitTypes.grassNun.passiveSkills.resurrection.hasResurrected = true;
                    
                    // 显示复活效果
                    const targetCell = document.querySelector(`.grid-cell[data-index="${deadUnitData.index}"]`);
                    if (targetCell) {
                        const resurrectionEffect = document.createElement('div');
                        resurrectionEffect.className = 'damage-number';
                        resurrectionEffect.style.color = '#FFD700'; // 金色
                        resurrectionEffect.style.fontSize = '16px';
                        resurrectionEffect.textContent = '复活!';
                        targetCell.appendChild(resurrectionEffect);
                        
                        setTimeout(() => {
                            if (targetCell.contains(resurrectionEffect)) {
                                targetCell.removeChild(resurrectionEffect);
                            }
                        }, 1500);
                        
                        // 更新单位显示
                        updateUnitDisplay(deadUnitData.index);
                    }
                    
                    return true; // 复活成功
                },
                // 重置复活技能状态（在每场战斗开始时调用）
                reset: () => {
                    unitTypes.grassNun.passiveSkills.resurrection.hasResurrected = false;
                    unitTypes.grassNun.passiveSkills.resurrection.firstDeadAlly = null;
                }
            }
        },
        skill: {
            type: 'active',
            name: '回复',
            description: '对最低血量单位回复300%血量',
            effect: (attacker) => {
                // 获取所有己方存活单位
                const isEnemy = battleUnits.find(u => u.unit === attacker).isEnemy;
                const allyUnits = battleUnits.filter(unitData => 
                    unitData.isEnemy === isEnemy && 
                    unitData.unit.currentHP > 0 && 
                    unitData.unit.currentHP < unitData.unit.maxHP
                );
                
                if (allyUnits.length === 0) {
                    return 0; // 没有需要治疗单位
                }
                
                // 找血量百分比最低单位
                let lowestHpUnit = allyUnits[0];
                let lowestHpPercentage = lowestHpUnit.unit.currentHP / lowestHpUnit.unit.maxHP;
                
                for (let i = 1; i < allyUnits.length; i++) {
                    const unitData = allyUnits[i];
                    const hpPercentage = unitData.unit.currentHP / unitData.unit.maxHP;
                    
                    if (hpPercentage < lowestHpPercentage) {
                        lowestHpUnit = unitData;
                        lowestHpPercentage = hpPercentage;
                    }
                }
                
                // 计算治疗量
                const healAmount = Math.ceil(attacker.attack * 3);
                
                // 应用治疗
                lowestHpUnit.unit.currentHP = Math.min(
                    lowestHpUnit.unit.currentHP + healAmount,
                    lowestHpUnit.unit.maxHP
                );
                
                // 显示治疗效果
                const targetCell = document.querySelector(`.grid-cell[data-index="${lowestHpUnit.index}"]`);
                if (targetCell) {
                    const healNumber = document.createElement('div');
                    healNumber.className = 'damage-number';
                    healNumber.style.color = '#4CAF50'; // 绿色
                    healNumber.textContent = `+${healAmount}`;
                    targetCell.appendChild(healNumber);
                    
                    setTimeout(() => {
                        if (targetCell.contains(healNumber)) {
                            targetCell.removeChild(healNumber);
                        }
                    }, 1000);

                    updateUnitDisplay(lowestHpUnit.index);
                }
                
                // 如果修女等级大于等于2，触发净化效果
                if (attacker.level >= 2 && unitTypes.grassNun.passiveSkills.purify) {
                    unitTypes.grassNun.passiveSkills.purify.effect(lowestHpUnit.unit);
                }
                
                return healAmount;
            }
        }
    },

    // 花仙子
    grass: { 
        hp: 25, 
        attack: 20, 
        speed: 2, 
        manaRegen: 0, 
        color: '#66BB6A', 
        icon: '🌿',
        job: 'support',
        name: '花仙子',
        inPool: 0,
        element: 'grass',
        isTrap: false,
        skill: {
            type: 'passive',
            name: '鼓舞',
            description: '对最近单位增加100%攻击力的蓝量',
            effect: (attacker, target) => {
                if (target) {
                    target.unit.mana += attacker.attack;
                    return true;
                }
                return false;
            }
        },
        // 被动技能
        passiveSkills: {
            // 2级解锁被动技能：激励
            inspire: {
                name: '激励',
                description: '主动技能给己方单位回蓝的同时，回蓝目标的速度+1，若下一回合该提速单位成功发动1次普攻或技能，立即重置其速度',
                unlockLevel: 2,
                // 存储被激励的单位信息 {unitIndex: {originalSpeed: number, hasActed: boolean}}
                inspiredUnits: {},
                // 激励效果
                applyInspire: (target, targetData) => {
                    // 获取目标的原始速度
                    const targetUnit = targetData.unit;
                    const originalSpeed = targetUnit.speed;
                    
                    // 记录原始速度并应用提速
                    if (!unitTypes.grass.passiveSkills.inspire.inspiredUnits[targetData.index]) {
                        unitTypes.grass.passiveSkills.inspire.inspiredUnits[targetData.index] = {
                            originalSpeed: originalSpeed,
                            hasActed: false
                        };
                        
                        // 提速效果
                        targetUnit.tempSpeed = originalSpeed + 1;
                        console.log(`${targetUnit.type} 被激励，速度从 ${originalSpeed} 提升到 ${targetUnit.tempSpeed}`);
                    }
                },
                // 重置速度
                resetSpeed: (targetData) => {
                    const targetUnit = targetData.unit;
                    const inspiredUnitInfo = unitTypes.grass.passiveSkills.inspire.inspiredUnits[targetData.index];
                    
                    if (inspiredUnitInfo) {
                        // 重置速度
                        delete targetUnit.tempSpeed;
                        console.log(`${targetUnit.type} 速度恢复到 ${inspiredUnitInfo.originalSpeed}`);
                        
                        // 移除记录
                        delete unitTypes.grass.passiveSkills.inspire.inspiredUnits[targetData.index];
                    }
                },
                // 清理所有激励效果
                cleanupInspire: () => {
                    unitTypes.grass.passiveSkills.inspire.inspiredUnits = {};
                }
            },
            // 3级解锁被动技能：躲避
            dodge: {
                name: '躲避',
                description: '每次自身血量发生下降，立即瞬移至己方战斗区随机空闲的格子上',
                unlockLevel: 3,
                effect: (targetData, damage) => {
                    // 获取己方战斗区域的范围
                    const isEnemy = targetData.isEnemy;
                    const startRow = isEnemy ? 0 : 4; // 敌方在上半区，我方在下半区
                    const endRow = isEnemy ? 3 : 7;
                    
                    // 获取所有空闲格子
                    const emptyCells = [];
                    for (let row = startRow; row <= endRow; row++) {
                        for (let col = 0; col < 6; col++) {
                            const index = row * 6 + col;
                            // 跳过当前位置
                            if (index === targetData.index) continue;
                            // 检查格子是否为空
                            if (!gameState.units.battleField[index]) {
                                emptyCells.push(index);
                            }
                        }
                    }
                    
                    // 如果没有空闲格子，则不进行瞬移
                    if (emptyCells.length === 0) return false;
                    
                    // 随机选择一个空闲格子
                    const randomIndex = Math.floor(Math.random() * emptyCells.length);
                    const newPosition = emptyCells[randomIndex];
                    
                    // 获取当前单位的DOM元素和目标格子的DOM元素
                    const currentCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                    const targetCell = document.querySelector(`.grid-cell[data-index="${newPosition}"]`);
                    
                    if (!currentCell || !targetCell) return false;
                    
                    // 移动单位到新位置
                    const unit = targetData.unit;
                    
                    // 从当前位置移除单位
                    gameState.units.battleField[targetData.index] = null;
                    
                    // 清除当前格子中的单位显示
                    while (currentCell.firstChild) {
                        currentCell.removeChild(currentCell.firstChild);
                    }
                    
                    // 将单位放置到新位置
                    gameState.units.battleField[newPosition] = unit;
                    targetData.index = newPosition; // 更新单位索引
                    
                    // 在新位置显示单位
                    const unitElement = createUnitElement(unit);
                    targetCell.appendChild(unitElement);
                    
                    // 显示瞬移效果
                    const dodgeText = document.createElement('div');
                    dodgeText.className = 'damage-number';
                    dodgeText.style.color = '#66BB6A'; // 绿色
                    dodgeText.textContent = '躲避!';
                    targetCell.appendChild(dodgeText);
                    
                    setTimeout(() => {
                        if (targetCell.contains(dodgeText)) {
                            targetCell.removeChild(dodgeText);
                        }
                    }, 1000);
                    
                    return true;
                }
            }
        }
    },

    // 融合单位：冰霜术士（水+土属性融合）
    frostMage: {
        hp: 100,
        attack: 2,
        speed: 6,
        manaRegen: 100,
        color: '#4FC3F7', // 水属性颜色
        icon: '❄️',
        job: 'mage', // 法师职业
        name: '冰霜术士',
        inPool: 0, // 不在初始池中，只能通过融合获得
        element: 'ice',
        isTrap: false,
        isFusionUnit: true, // 标记为融合单位
        fusionRequirements: {
            units: ['water', 'earth'], // 需要水属性和土属性单位融合
            level: 3 // 需要3级单位
        },
        // 普通攻击对九宫格内所有敌人造成伤害
        normalAttack: (attacker, target) => {
            // 获取攻击者和目标的信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            const targetData = battleUnits.find(u => u.unit === target);
            
            if (!attackerData || !targetData) return attacker.attack;
            
            // 获取目标所在行和列
            const targetRow = Math.floor(targetData.index / 6);
            const targetCol = targetData.index % 6;
            
            // 对九宫格内所有敌人造成伤害
                    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                        for (let colOffset = -1; colOffset <= 1; colOffset++) {
                            const affectedRow = targetRow + rowOffset;
                            const affectedCol = targetCol + colOffset;
                            
                            // 检查是否在战场内
                            if (affectedRow >= 0 && affectedRow < 8 && affectedCol >= 0 && affectedCol < 6) {
                                const affectedIndex = affectedRow * 6 + affectedCol;
                        
                        // 跳过当前目标（当前目标会在外部处理）
                        if (affectedIndex === targetData.index) continue;
                        
                        // 查找该位置的单位
                        const potentialTarget = battleUnits.find(u => 
                            u.index === affectedIndex && 
                            u.isEnemy !== attackerData.isEnemy && 
                            u.unit.currentHP > 0
                        );
                        
                        if (potentialTarget) {
                                        // 造成伤害
                            const damage = attacker.attack;
                            const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                            
                            // 应用伤害
                            applyDamage(potentialTarget, damage, targetCell, attackerData);
                            
                            // 被攻击单位获得20点蓝量
                            potentialTarget.unit.mana = Math.min(300, potentialTarget.unit.mana + 20);
                        }
                    }
                }
            }
            
            return attacker.attack; // 返回普通攻击伤害
        },
        skill: {
            type: 'active',
            name: '冰冻',
            description: '进行一次普攻，并对命中的所有敌人添加"无法行动"状态，持续2回合',
            effect: (attacker, target) => {
                // 获取攻击者和目标的信息
                const attackerData = battleUnits.find(u => u.unit === attacker);
                const targetData = battleUnits.find(u => u.unit === target);
                
                if (!attackerData || !targetData) return attacker.attack;
                
                // 获取目标所在行和列
                const targetRow = Math.floor(targetData.index / 6);
                const targetCol = targetData.index % 6;
                
                // 对九宫格内所有敌人造成伤害并添加无法行动状态
                for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                    for (let colOffset = -1; colOffset <= 1; colOffset++) {
                        const affectedRow = targetRow + rowOffset;
                        const affectedCol = targetCol + colOffset;
                        
                        // 检查是否在战场内
                        if (affectedRow >= 0 && affectedRow < 8 && affectedCol >= 0 && affectedCol < 6) {
                            const affectedIndex = affectedRow * 6 + affectedCol;
                            
                            // 查找该位置的单位
                            const potentialTarget = battleUnits.find(u => 
                                u.index === affectedIndex && 
                                u.isEnemy !== attackerData.isEnemy && 
                                u.unit.currentHP > 0
                            );
                            
                            if (potentialTarget) {
                                // 造成伤害
                                const damage = attacker.attack;
                                const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                                applyDamage(potentialTarget, damage, targetCell, attackerData);
                                
                                // 添加无法行动状态
                                if (!potentialTarget.unit.statusEffects) {
                                    potentialTarget.unit.statusEffects = {};
                                }
                                
                                // 检查目标是否有无敌状态
                                if (potentialTarget.unit.statusEffects.invincible) {
                                    // 触发无敌效果抵消负面效果
                                    if (targetCell) {
                                        // 显示无敌触发效果
                                        const invincibleTrigger = document.createElement('div');
                                        invincibleTrigger.className = 'damage-number';
                                        invincibleTrigger.style.color = '#FFD700'; // 金色
                                        invincibleTrigger.style.fontSize = '16px';
                                        invincibleTrigger.textContent = '无敌抵挡!';
                                        targetCell.appendChild(invincibleTrigger);
                                        
                                        setTimeout(() => {
                                            if (targetCell.contains(invincibleTrigger)) {
                                                targetCell.removeChild(invincibleTrigger);
                                            }
                                        }, 1500);
                                        
                                        // 移除无敌状态和视觉效果
                                        delete potentialTarget.unit.statusEffects.invincible;
                                        
                                        const invincibleEffect = targetCell.querySelector('.invincible-effect');
                                        if (invincibleEffect) {
                                            targetCell.removeChild(invincibleEffect);
                                        }
                                    }
                                    
                                    // 不添加负面效果
                                    continue;
                                }
                                
                                potentialTarget.unit.statusEffects.cantAct = {
                    duration: 2,  // 持续2回合
                    startTurn: battleTurn  // 从当前回合开始计算
                };
                
                                // 添加视觉效果
                if (targetCell) {
                                    // 移除已有效果
                                    const existingEffect = targetCell.querySelector('.frost-effect');
                    if (existingEffect) {
                        targetCell.removeChild(existingEffect);
                    }
                    
                                    // 添加冰冻效果
                    const effectElement = document.createElement('div');
                                    effectElement.className = 'frost-effect';
                    effectElement.style.position = 'absolute';
                    effectElement.style.top = '0';
                    effectElement.style.left = '0';
                    effectElement.style.width = '100%';
                    effectElement.style.height = '100%';
                    effectElement.style.backgroundColor = 'rgba(79, 195, 247, 0.5)';
                    effectElement.style.borderRadius = '5px';
                    effectElement.style.zIndex = '10';
                    effectElement.style.pointerEvents = 'none';
                    effectElement.style.animation = 'water-prison-pulse 2s infinite';
                    targetCell.appendChild(effectElement);
                                }
                            }
                        }
                    }
                }
                
                return attacker.attack; // 返回攻击伤害
            }
        }
    },

    // 融合单位：红缨枪（火+电属性融合）
    fireSpear: {
        hp: 200,
        attack: 5,
        speed: 8,
        manaRegen: 100,
        color: '#FF5252', // 火属性颜色
        icon: '⚔️',
        job: 'assassin', // 刺客职业
        name: '红缨枪',
        inPool: 0, // 不在初始池中，只能通过融合获得
        element: 'flame',
        isTrap: false,
        isFusionUnit: true, // 标记为融合单位
        fusionRequirements: {
            units: ['fire', 'electric'], // 需要火属性和电属性单位融合
            level: 3 // 需要3级单位
        },
        // 普通攻击只对同列所有敌人造成伤害，不附带灼烧效果
        normalAttack: (attacker, target) => {
            // 获取攻击者和目标的信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            const targetData = battleUnits.find(u => u.unit === target);
            
            if (!attackerData || !targetData) return attacker.attack;
            
            // 获取目标所在列
            const targetCol = targetData.index % 6;
            
            // 对同列所有敌人造成伤害
                    for (let i = 0; i < battleUnits.length; i++) {
                const potentialTarget = battleUnits[i];
                // 跳过同阵营单位、已死亡单位和当前目标（当前目标会在外部处理）
                if (potentialTarget.isEnemy === attackerData.isEnemy || 
                    potentialTarget.unit.currentHP <= 0 || 
                    potentialTarget.index === targetData.index) continue;
                
                // 检查是否在同一列
                const potentialCol = potentialTarget.index % 6;
                if (potentialCol === targetCol) {
                    // 造成伤害
                    const damage = attacker.attack;
                    const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                    
                    // 应用伤害
                    applyDamage(potentialTarget, damage, targetCell, attackerData);
                    
                    // 被攻击单位获得20点蓝量
                    potentialTarget.unit.mana = Math.min(300, potentialTarget.unit.mana + 20);
                }
            }
            
            return attacker.attack; // 返回普通攻击伤害
        },
        skill: {
            type: 'active',
            name: '灼烧',
            description: '被技能命中的对方单位全部添加"灼烧"印记，每回合受到20%攻击力的伤害，持续3回合',
            // 主动技能：添加灼烧效果
            effect: (attacker, target) => {
                // 获取攻击者和目标的信息
                const attackerData = battleUnits.find(u => u.unit === attacker);
                const targetData = battleUnits.find(u => u.unit === target);
                
                if (!attackerData || !targetData) return attacker.attack;
                
                // 获取目标所在列
                const targetCol = targetData.index % 6;
                
                // 对同列所有敌人添加灼烧效果
                for (let i = 0; i < battleUnits.length; i++) {
                    const potentialTarget = battleUnits[i];
                    // 跳过同阵营单位、已死亡单位
                    if (potentialTarget.isEnemy === attackerData.isEnemy || 
                        potentialTarget.unit.currentHP <= 0) continue;
                    
                    // 检查是否在同一列
                    const potentialCol = potentialTarget.index % 6;
                    if (potentialCol === targetCol) {
                        // 造成伤害
                        const damage = attacker.attack;
                        const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                        applyDamage(potentialTarget, damage, targetCell, attackerData);
                    
                        // 添加灼烧效果
                        if (!potentialTarget.unit.statusEffects) {
                            potentialTarget.unit.statusEffects = {};
                        }
                        
                        // 如果目标没有灼烧状态，添加灼烧状态
                        if (!potentialTarget.unit.statusEffects.burned) {
                            // 检查目标是否有无敌状态
                            if (potentialTarget.unit.statusEffects.invincible) {
                                // 触发无敌效果抵消负面效果
                                if (targetCell) {
                                    // 显示无敌触发效果
                                    const invincibleTrigger = document.createElement('div');
                                    invincibleTrigger.className = 'damage-number';
                                    invincibleTrigger.style.color = '#FFD700'; // 金色
                                    invincibleTrigger.style.fontSize = '16px';
                                    invincibleTrigger.textContent = '无敌抵挡!';
                                    targetCell.appendChild(invincibleTrigger);
                                    
                                    setTimeout(() => {
                                        if (targetCell.contains(invincibleTrigger)) {
                                            targetCell.removeChild(invincibleTrigger);
                                        }
                                    }, 1500);
                                    
                                    // 移除无敌状态和视觉效果
                                    delete potentialTarget.unit.statusEffects.invincible;
                                    
                                    const invincibleEffect = targetCell.querySelector('.invincible-effect');
                                    if (invincibleEffect) {
                                        targetCell.removeChild(invincibleEffect);
                                    }
                                }
                                
                                // 不添加负面效果
                                continue;
                            }
                            
                            // 检查电属性共鸣闪避效果
                            if (typeof canDodge === 'function' && canDodge(potentialTarget, 'debuff')) {
                                // 闪避成功，不施加灼烧效果
                                continue;
                            }
                            
                            potentialTarget.unit.statusEffects.burned = {
                                startTurn: battleTurn,
                                duration: 3,
                                damage: Math.ceil(attacker.attack * 0.2), // 20%攻击力的伤害
                                source: attacker
                            };
                            
                            // 添加视觉效果
                            const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                            if (targetCell) {
                                const burnEffect = document.createElement('div');
                                burnEffect.className = 'burn-effect';
                                burnEffect.style.position = 'absolute';
                                burnEffect.style.top = '0';
                                burnEffect.style.left = '0';
                                burnEffect.style.width = '100%';
                                burnEffect.style.height = '100%';
                                burnEffect.style.backgroundColor = 'rgba(255, 82, 82, 0.3)';
                                burnEffect.style.borderRadius = '5px';
                                burnEffect.style.animation = 'burn-pulse 1.5s infinite';
                                burnEffect.style.pointerEvents = 'none';
                                burnEffect.style.zIndex = '1';
                                targetCell.appendChild(burnEffect);
                            }
                        }
                    }
                }
                
                return attacker.attack; // 返回攻击伤害
            }
        }
    },

    // 融合单位：雷霆射手（电+草属性融合）
    thunderArcher: {
        hp: 150,
        attack: 3,
        speed: 9,
        manaRegen: 30,
        color: '#7E57C2', // 电属性颜色
        icon: '🏹',
        job: 'ranged', // 远程职业
        name: '雷霆射手',
        inPool: 0, // 不在初始池中，只能通过融合获得
        element: 'wind',
        isTrap: false,
        isFusionUnit: true, // 标记为融合单位
        fusionRequirements: {
            units: ['electric', 'grass'], // 需要电属性和草属性单位融合
            level: 3 // 需要3级单位
        },
        // 普通攻击对目标所在行的所有敌人造成伤害
        normalAttack: (attacker, target) => {
            // 获取攻击者和目标的信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            const targetData = battleUnits.find(u => u.unit === target);
            
            if (!attackerData || !targetData) return attacker.attack;
            
            // 获取目标所在行
            const targetRow = Math.floor(targetData.index / 6);
            
            // 对同行所有敌人造成伤害
            for (let i = 0; i < battleUnits.length; i++) {
                const potentialTarget = battleUnits[i];
                // 跳过同阵营单位、已死亡单位和当前目标（当前目标会在外部处理）
                if (potentialTarget.isEnemy === attackerData.isEnemy || 
                    potentialTarget.unit.currentHP <= 0 || 
                    potentialTarget.index === targetData.index) continue;
                
                // 检查是否在同一行
                const potentialRow = Math.floor(potentialTarget.index / 6);
                if (potentialRow === targetRow) {
                    // 造成伤害
                    const damage = attacker.attack;
                    const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                    
                    // 应用伤害
                    applyDamage(potentialTarget, damage, targetCell, attackerData);
                    
                    // 被攻击单位获得20点蓝量
                    potentialTarget.unit.mana = Math.min(300, potentialTarget.unit.mana + 20);
                }
            }
            
            return attacker.attack; // 返回普通攻击伤害
        },
        skill: {
            type: 'active',
            name: '连射',
            description: '连续发动3次普通攻击',
            repeatTimes: 3, // 连续攻击3次
            effect: (attacker, target) => {
                return attacker.attack; // 返回普通攻击伤害
            },
            executeTripleShot: (attackerUnit, attackerIndex, attackerData, isEnemy) => {
                // 标记技能执行中
                isSkillExecuting = true;
                let damage = 0;
                
                const performTripleShot = (attackIndex) => {
                    if (attackIndex >= unitTypes.thunderArcher.skill.repeatTimes) {
                        isSkillExecuting = false;
                        return; // 结束递归
                    }
                    
                    // 寻找攻击目标
                    let currentTarget = findDefaultTarget(attackerIndex, isEnemy);
                    
                    if (currentTarget) {
                        const targetCell = document.querySelector(`.grid-cell[data-index="${currentTarget.index}"]`);
                        
                        // 造成伤害 - 注意这里使用的是normalAttack而不是skill.effect
                        damage = unitTypes.thunderArcher.normalAttack(attackerUnit, currentTarget.unit);
                        applyDamage(currentTarget, damage, targetCell, attackerData);
                        
                        setTimeout(() => {
                            performTripleShot(attackIndex + 1);
                        }, 300);
                    } else {
                        console.log('连射技能提前结束：没有存活的敌人');
                        isSkillExecuting = false;
                        return;
                    }
                };
                
                // 开始第一次攻击
                performTripleShot(0);
                
                return damage;
            }
        }
    },
    
    // 融合单位：莲花仙女（草+水属性融合）
    lotusNymph: {
        hp: 250, 
        attack: 2,
        speed: 4,
        manaRegen: 100,
        color: '#8BC34A', // 草属性颜色
        icon: '🌸',
        job: 'support', // 辅助职业
        name: '莲花仙女',
        inPool: 0, // 不在初始池中，只能通过融合获得
        element: 'wood',
        isTrap: false,
        isFusionUnit: true, // 标记为融合单位
        fusionRequirements: {
            units: ['grass', 'water'], // 需要草属性和水属性单位融合
            level: 3 // 需要3级单位
        },
        // 普通行动：对距自己最近己方单位所在列的所有己方单位回复攻击力100%的蓝量，自己回复20蓝量
        normalAttack: (attacker, target) => {
            // 获取攻击者信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            if (!attackerData) return 0;

            // 找到距离最近的己方单位
            let closestAlly = null;
            let minDistance = Infinity;

            for (let i = 0; i < battleUnits.length; i++) {
                const potentialAlly = battleUnits[i];
                // 跳过敌方单位、已死亡单位和自己
                if (potentialAlly.isEnemy !== attackerData.isEnemy || 
                    potentialAlly.unit.currentHP <= 0 || 
                    potentialAlly.index === attackerData.index) continue;
                
                // 计算距离（简单的行列距离）
                const allyRow = Math.floor(potentialAlly.index / 6);
                const allyCol = potentialAlly.index % 6;
                const attackerRow = Math.floor(attackerData.index / 6);
                const attackerCol = attackerData.index % 6;
                
                const distance = Math.abs(allyRow - attackerRow) + Math.abs(allyCol - attackerCol);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestAlly = potentialAlly;
                }
            }
            
            // 如果找到了最近的己方单位
            if (closestAlly) {
                // 获取该单位所在列
                const targetCol = closestAlly.index % 6;

                // 对同列所有己方单位进行治疗
                for (let i = 0; i < battleUnits.length; i++) {
                    const potentialTarget = battleUnits[i];
                    // 跳过敌方单位和已死亡单位
                    if (potentialTarget.isEnemy !== attackerData.isEnemy || 
                        potentialTarget.unit.currentHP <= 0) continue;
                    
                    // 检查是否在同一列
                    const potentialCol = potentialTarget.index % 6;
                    if (potentialCol === targetCol) {
                        // 回复蓝量
                        const healAmount = attacker.attack;
                        potentialTarget.unit.mana = Math.min(300, potentialTarget.unit.mana + healAmount);
                        
                        // 更新单位显示
                        updateUnitDisplay(potentialTarget.index);
                    }
                }
            }
            // 自身回复蓝量
            attacker.mana = Math.min(300, attacker.mana + 100);
            updateUnitDisplay(attackerData.index);
            return 0; // 不造成伤害
        },
        skill: {
            type: 'active',
            name: '不染',
            description: '回血回蓝，并移除所有负面效果',
            effect: (attacker, target) => {
                // 获取攻击者信息
                const attackerData = battleUnits.find(u => u.unit === attacker);
                if (!attackerData) return 0;
                
                // 找到距离最近的己方单位
                let closestAlly = null;
                let minDistance = Infinity;
                
                for (let i = 0; i < battleUnits.length; i++) {
                    const potentialAlly = battleUnits[i];
                    // 跳过敌方单位、已死亡单位和自己
                    if (potentialAlly.isEnemy !== attackerData.isEnemy || 
                        potentialAlly.unit.currentHP <= 0 || 
                        potentialAlly.index === attackerData.index) continue;
                    
                    // 计算距离（简单的行列距离）
                    const allyRow = Math.floor(potentialAlly.index / 6);
                    const allyCol = potentialAlly.index % 6;
                    const attackerRow = Math.floor(attackerData.index / 6);
                    const attackerCol = attackerData.index % 6;
                    
                    const distance = Math.abs(allyRow - attackerRow) + Math.abs(allyCol - attackerCol);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestAlly = potentialAlly;
                    }
                }
                
                // 如果找到了最近的己方单位
                if (closestAlly) {
                    // 获取该单位所在列
                    const targetCol = closestAlly.index % 6;
                    
                    // 对同列所有己方单位进行治疗和移除负面效果
                    for (let i = 0; i < battleUnits.length; i++) {
                        const potentialTarget = battleUnits[i];
                        // 跳过敌方单位和已死亡单位
                        if (potentialTarget.isEnemy !== attackerData.isEnemy || 
                            potentialTarget.unit.currentHP <= 0) continue;
                        
                        // 检查是否在同一列
                        const potentialCol = potentialTarget.index % 6;
                        if (potentialCol === targetCol) {
                            // 回复生命值
                            const healAmount = attacker.attack;
                            potentialTarget.unit.currentHP = Math.min(
                                potentialTarget.unit.maxHP, 
                                potentialTarget.unit.currentHP + healAmount
                            );
                            
                            // 回复蓝量
                            potentialTarget.unit.mana = Math.min(300, potentialTarget.unit.mana + healAmount);
                            
                            // 移除所有负面状态效果
                            if (potentialTarget.unit.statusEffects) {
                                // 移除灼烧效果
                                if (potentialTarget.unit.statusEffects.burned) {
                                    delete potentialTarget.unit.statusEffects.burned;
                                    // 移除视觉效果
                                    const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                                    if (targetCell) {
                                        const burnEffect = targetCell.querySelector('.burn-effect');
                                        if (burnEffect) {
                                            targetCell.removeChild(burnEffect);
                                        }
                                    }
                                }
                                
                                // 移除中毒状态
                                if (potentialTarget.unit.statusEffects.poisoned) {
                                    delete potentialTarget.unit.statusEffects.poisoned;
                                    // 移除视觉效果
                                    const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                                    if (targetCell) {
                                        const poisonEffect = targetCell.querySelector('.poison-effect');
                                        if (poisonEffect) {
                                            targetCell.removeChild(poisonEffect);
                                        }
                                    }
                                }
                                
                                // 移除无法行动状态
                                if (potentialTarget.unit.statusEffects.cantAct) {
                                    delete potentialTarget.unit.statusEffects.cantAct;
                                    // 移除视觉效果
                                    const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                                    if (targetCell) {
                                        const frostEffect = targetCell.querySelector('.frost-effect');
                                        if (frostEffect) {
                                            targetCell.removeChild(frostEffect);
                                        }
                                        const lavaPrisonEffect = targetCell.querySelector('.lava-prison-effect');
                                        if (lavaPrisonEffect) {
                                            targetCell.removeChild(lavaPrisonEffect);
                                        }
                                    }
                                }
                                
                                // 可以添加其他负面状态的移除
                            }
                            
                            // 显示治疗和净化效果
                            const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                            if (targetCell) {
                                const purifyEffect = document.createElement('div');
                                purifyEffect.className = 'purify-effect';
                                purifyEffect.style.position = 'absolute';
                                purifyEffect.style.top = '0';
                                purifyEffect.style.left = '0';
                                purifyEffect.style.width = '100%';
                                purifyEffect.style.height = '100%';
                                purifyEffect.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                                purifyEffect.style.borderRadius = '5px';
                                purifyEffect.style.animation = 'purify-pulse 2s';
                                purifyEffect.style.pointerEvents = 'none';
                                purifyEffect.style.zIndex = '2';
                                targetCell.appendChild(purifyEffect);
                                
                                // 移除净化特效
                        setTimeout(() => {
                                    if (targetCell.contains(purifyEffect)) {
                                        targetCell.removeChild(purifyEffect);
                                    }
                                }, 2000);
                            }
                            
                            // 更新单位显示
                            updateUnitDisplay(potentialTarget.index);
                        }
                    }
                }
                
                return 0; // 不造成伤害
            }
        }
    },
    
    // 融合单位：熔岩守护者（土+火属性融合）
    lavaGuardian: {
        hp: 3000,
        attack: 20,
        speed: 5,
        manaRegen: 10,
        color: '#8D6E63', // 土属性颜色
        icon: '🌋',
        job: 'warrior', // 战士职业
        name: '熔岩守护者',
        inPool: 0, // 不在初始池中，只能通过融合获得
        element: 'rock',
        isTrap: false,
        isFusionUnit: true, // 标记为融合单位
        fusionRequirements: {
            units: ['earth', 'fire'], // 需要土属性和火属性单位融合
            level: 3 // 需要3级单位
        },
        // 普通攻击：对攻击目标造成攻击力150%伤害且有50%概率对其添加"无法行动"状态
        normalAttack: (attacker, target) => {
            // 获取攻击者和目标的信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            const targetData = battleUnits.find(u => u.unit === target);
            
            if (!attackerData || !targetData) return attacker.attack * 1.5;
            
            // 50%概率添加无法行动状态
            if (Math.random() < 0.0) {
                // 添加无法行动状态
                if (!targetData.unit.statusEffects) {
                    targetData.unit.statusEffects = {};
                }
                
                targetData.unit.statusEffects.cantAct = {
                    duration: 2,  // 持续2回合
                    startTurn: battleTurn  // 从当前回合开始计算
                };
                
                // 视觉效果
                const targetCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                if (targetCell) {
                    // 移除已有效果
                    const existingEffect = targetCell.querySelector('.lava-prison-effect');
                    if (existingEffect) {
                        targetCell.removeChild(existingEffect);
                    }
                    
                    // 添加熔岩禁锢效果
                    const effectElement = createEffectElement('lava-prison-effect');
                    targetCell.appendChild(effectElement);
                }
            }
            
            return attacker.attack * 1.5; // 返回150%攻击伤害
        },
        skill: {
            type: 'active',
            name: '列阵',
            description: '对与自己同行的所有己方单位添加初始生命值20%的护盾',
            shieldAmount: {},  // 存储每个单位的护盾值，格式为 {battleIndex: shieldValue}
            effect: function(attacker) {
                // 获取攻击者所在行
                const attackerData = battleUnits.find(u => u.unit === attacker);
                if (!attackerData) return 0;
                
                const attackerRow = Math.floor(attackerData.index / 6);
                
                // 对同行所有己方单位添加护盾
                for (let i = 0; i < battleUnits.length; i++) {
                    const allyData = battleUnits[i];
                    // 跳过敌方单位、已死亡单位
                    if (allyData.isEnemy !== attackerData.isEnemy || 
                        allyData.unit.currentHP <= 0) continue;
                    
                    // 检查是否在同一行
                    const allyRow = Math.floor(allyData.index / 6);
                    if (allyRow === attackerRow) {
                        // 计算护盾值为初始血量的20%
                        
                        const shieldValue = Math.round(unitTypes.lavaGuardian.hp * 0.02);
                        
                        // 确保shieldAmount对象已初始化
                        if (!this.shieldAmount) {
                            this.shieldAmount = {};
                        }
                        
                        // 如果已有护盾，则叠加护盾值
                        if (this.shieldAmount[allyData.index]) {
                            this.shieldAmount[allyData.index] += shieldValue;
                        } else {
                            this.shieldAmount[allyData.index] = shieldValue;
                        }
                        console.log(`Unit ${allyData.unit.type} at index ${allyData.index} has shield: ${this.shieldAmount[allyData.index]}`);
                        // 更新护盾显示
                        this.updateShieldDisplay(allyData.index);
                    }
                }
                
                return 0; // 不造成伤害
            },
            updateShieldDisplay: function(unitIndex) {
                const cell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
                if (!cell) return;
                
                // 移除已有的护盾显示（如果有）
                const existingShield = cell.querySelector('.unit-shield');
                if (existingShield) {
                    cell.removeChild(existingShield);
                }
                
                // 如果有护盾值，添加护盾显示
                if (this.shieldAmount[unitIndex] && this.shieldAmount[unitIndex] > 0) {
                    const shieldElement = document.createElement('div');
                    shieldElement.className = 'unit-shield';
                    shieldElement.style.position = 'absolute';
                    shieldElement.style.top = '20px';
                    shieldElement.style.left = '2px';
                    shieldElement.style.fontSize = '10px';
                    shieldElement.style.color = '#8D6E63';
                    shieldElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
                    shieldElement.style.padding = '2px';
                    shieldElement.style.borderRadius = '3px';
                    shieldElement.style.zIndex = '5';
                    shieldElement.textContent = `🛡️${this.shieldAmount[unitIndex]}`;
                    cell.appendChild(shieldElement);
                }
            },
            clearShield: function(unitIndex) {
                // 清除护盾值
                if (this.shieldAmount[unitIndex]) {
                    delete this.shieldAmount[unitIndex];
                }
                
                // 移除护盾显示
                const cell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
                if (cell) {
                    const shieldElement = cell.querySelector('.unit-shield');
                    if (shieldElement) {
                        cell.removeChild(shieldElement);
                    }
                }
            },
            cleanupShields: function() {
                // 战斗结束时清理所有护盾
                for (const unitIndex in this.shieldAmount) {
                    this.clearShield(unitIndex);
                }
                // 重置护盾信息
                this.shieldAmount = {};
            }
        }
    },
    
    // 融合单位：生命之母（莲花仙女+冰霜术士融合）
    motherOfLife: {
        hp: 500,
        attack: 10,
        speed: 4,
        manaRegen: 40,
        color: '#8BC34A', // 草属性颜色
        icon: '🌿',
        job: 'support', // 辅助职业
        name: '生命之母',
        inPool: 0, // 不在初始池中，只能通过融合获得
        element: 'normal',
        isTrap: false,
        isFusionUnit: true, // 标记为融合单位
        fusionRequirements: {
            units: ['lotusNymph', 'frostMage'], // 需要莲花仙女和冰霜术士融合
            level: 3 // 需要3级单位
        },
        // 龙蛋互动技能
        dragonEggInteraction: true,
        // 普通行动：对以自己为中心的九宫格内所有己方单位（包括自己）回复攻击力100%的血量和蓝量
        normalAttack: (attacker, target) => {
            // 获取攻击者信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            if (!attackerData) return 0;
            
            // 获取攻击者所在行和列
            const attackerRow = Math.floor(attackerData.index / 6);
            const attackerCol = attackerData.index % 6;
            
            // 对九宫格内所有己方单位回复血量和蓝量
            for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
                for (let colOffset = -1; colOffset <= 1; colOffset++) {
                    const affectedRow = attackerRow + rowOffset;
                    const affectedCol = attackerCol + colOffset;
                    
                    // 检查是否在战场内
                    if (affectedRow >= 0 && affectedRow < 8 && affectedCol >= 0 && affectedCol < 6) {
                        const affectedIndex = affectedRow * 6 + affectedCol;
                        
                        // 查找该位置的单位
                        const potentialTarget = battleUnits.find(u => 
                            u.index === affectedIndex && 
                            u.isEnemy === attackerData.isEnemy && 
                            u.unit.currentHP > 0
                        );
                        
                        if (potentialTarget) {
                            // 回复血量
                            const healAmount = attacker.attack;
                            potentialTarget.unit.currentHP = Math.min(
                                potentialTarget.unit.maxHP, 
                                potentialTarget.unit.currentHP + healAmount
                            );
                            
                            // 回复蓝量
                            potentialTarget.unit.mana = Math.min(300, potentialTarget.unit.mana + healAmount);
                            
                            // 更新单位显示
                            updateUnitDisplay(potentialTarget.index);
                            
                            // 添加治疗效果
                            const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                            if (targetCell) {
                                // 创建治疗效果
                                const healEffect = document.createElement('div');
                                healEffect.className = 'heal-effect';
                                healEffect.textContent = `+${healAmount}`;
                                healEffect.style.position = 'absolute';
                                healEffect.style.top = '10px';
                                healEffect.style.left = '50%';
                                healEffect.style.transform = 'translateX(-50%)';
                                healEffect.style.color = '#4CAF50';
                                healEffect.style.fontWeight = 'bold';
                                healEffect.style.fontSize = '16px';
                                healEffect.style.textShadow = '0 0 3px white';
                                healEffect.style.zIndex = '100';
                                targetCell.appendChild(healEffect);
                                
                                // 动画效果
                        setTimeout(() => {
                                    healEffect.style.transition = 'top 1s, opacity 1s';
                                    healEffect.style.top = '-20px';
                                    healEffect.style.opacity = '0';
                                    setTimeout(() => {
                                        targetCell.removeChild(healEffect);
                        }, 1000);
                                }, 10);
                    }
                    }
                }
            }
            }
            
            return 0; // 不造成伤害
        },
        skill: {
            type: 'active',
            name: '禁锢',
            description: '所有敌方单位添加"无法行动"状态，成功率50%，每一名敌方单位单独计算概率',
            effect: (attacker, target) => {
                // 获取攻击者信息
                const attackerData = battleUnits.find(u => u.unit === attacker);
                if (!attackerData) return 0;
                
                // 对所有敌方单位尝试添加无法行动状态
                for (let i = 0; i < battleUnits.length; i++) {
                    const potentialTarget = battleUnits[i];
                    // 跳过己方单位和已死亡单位
                    if (potentialTarget.isEnemy === attackerData.isEnemy || 
                        potentialTarget.unit.currentHP <= 0) continue;
                    
                    // 50%概率添加无法行动状态
                    if (Math.random() < 0.5) {
                        // 检查目标是否有无敌状态
                        if (potentialTarget.unit.statusEffects && potentialTarget.unit.statusEffects.invincible) {
                            // 触发无敌效果抵消负面效果
                            const invincibleCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                            if (invincibleCell) {
                                // 显示无敌触发效果
                                const invincibleTrigger = document.createElement('div');
                                invincibleTrigger.className = 'damage-number';
                                invincibleTrigger.style.color = '#FFD700'; // 金色
                                invincibleTrigger.style.fontSize = '16px';
                                invincibleTrigger.textContent = '无敌抵挡!';
                                invincibleCell.appendChild(invincibleTrigger);
                                
                                setTimeout(() => {
                                    if (invincibleCell.contains(invincibleTrigger)) {
                                        invincibleCell.removeChild(invincibleTrigger);
                                    }
                                }, 1500);
                                
                                // 移除无敌状态和视觉效果
                                delete potentialTarget.unit.statusEffects.invincible;
                                
                                const invincibleEffect = invincibleCell.querySelector('.invincible-effect');
                                if (invincibleEffect) {
                                    invincibleCell.removeChild(invincibleEffect);
                                }
                            }
                            
                            // 不添加负面效果
                            continue;
                        }
                        
                        // 添加无法行动状态
                        if (!potentialTarget.unit.statusEffects) {
                            potentialTarget.unit.statusEffects = {};
                        }
                        
                        potentialTarget.unit.statusEffects.cantAct = {
                    duration: 2,  // 持续2回合
                    startTurn: battleTurn  // 从当前回合开始计算
                };
                
                        // 添加视觉效果
                        const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                if (targetCell) {
                    // 移除已有效果
                            const existingEffect = targetCell.querySelector('.frost-effect');
                    if (existingEffect) {
                        targetCell.removeChild(existingEffect);
                    }
                    
                            // 添加禁锢效果
                    const effectElement = document.createElement('div');
                            effectElement.className = 'frost-effect';
                    effectElement.style.position = 'absolute';
                    effectElement.style.top = '0';
                    effectElement.style.left = '0';
                    effectElement.style.width = '100%';
                    effectElement.style.height = '100%';
                            effectElement.style.backgroundColor = 'rgba(139, 195, 74, 0.5)';
                    effectElement.style.borderRadius = '5px';
                    effectElement.style.zIndex = '10';
                    effectElement.style.pointerEvents = 'none';
                    effectElement.style.animation = 'water-prison-pulse 2s infinite';
                    targetCell.appendChild(effectElement);
                        }
                    }
                }
                
                return 0; // 不造成伤害
            }
        }
    },

    // 龙蛋单位定义
    dragonEgg: {
        hp: 10,
        attack: 0,
        speed: 1,
        manaRegen: 0,
        color: '#FFC107', // 金色
        icon: '🥚',
        job: 'support', // 辅助职业
        name: '龙蛋',
        inPool: 0, // 不在初始池中，只能通过生命之母购买
        element: 'normal',
        isTrap: false,
        // 龙蛋不发动普通攻击
        normalAttack: (attacker, target) => {
            return 0; // 不造成伤害
        },
        // 龙蛋没有主动技能
        skill: null
    },
    
    // 巨龙单位定义
    dragon: {
        hp: 1000,
        attack: 0, // 伤害来自蓝量
        speed: 3, // 增加速度使其能够更好地参与战斗
        manaRegen: 0, // 增加蓝量恢复速度
        color: '#FFC107', // 金色
        icon: '🐉',
        job: 'support', // 辅助职业
        name: '巨龙',
        inPool: 0, // 不在初始池中，只能通过龙蛋孵化
        element: 'normal', // 设置为火属性更合理
        isTrap: false,
        // 巨龙的普通攻击：对目标所在列的所有敌方单位造成巨龙当前蓝量100%的伤害，并消耗所有蓝量
        normalAttack: (attacker, target) => {
            // 获取攻击者和目标的信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            const targetData = battleUnits.find(u => u.unit === target);
            
            if (!attackerData || !targetData) return 0;
            
            // 获取目标所在列
            const targetCol = targetData.index % 6;
            
            // 计算伤害值（当前蓝量的100%）
            const damage = attacker.mana;
            // 消耗所有蓝量
            const usedMana = attacker.mana;
            attacker.mana = 0;
            // 对同列所有敌人造成伤害
            for (let i = 0; i < battleUnits.length; i++) {
                const potentialTarget = battleUnits[i];
                // 跳过同阵营单位、已死亡单位
                if (potentialTarget.isEnemy === attackerData.isEnemy || 
                    potentialTarget.unit.currentHP <= 0) continue;
                
                // 检查是否在同一列
                const potentialCol = potentialTarget.index % 6;
                if (potentialCol === targetCol) {
                    const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);     
                    
                    // 应用伤害
                    applyDamage(potentialTarget, damage, targetCell, attackerData);
                    
                    // 敌方单位蓝量-25，巨龙蓝量+25
                    potentialTarget.unit.mana = Math.max(0, potentialTarget.unit.mana - 25);
                    attacker.mana = Math.min(300, attacker.mana + 25);
                }
            }

            updateUnitDisplay(attackerData.index);
            return 0; // 返回0（避免二次伤害）
        },
        // 巨龙没有主动技能
        skill: null
    },
    
    // 融合单位：圣战士（红缨枪+熔岩守护者融合）
    holyWarrior: {
        hp: 1000,
        attack: 100,
        speed: 4,
        manaRegen: 50,
        color: '#FF5252', // 火属性颜色
        icon: '⚔️',
        job: 'warrior', // 战士职业
        name: '圣战士',
        inPool: 0, // 不在初始池中，只能通过融合获得
        element: 'light',
        isTrap: false,
        isFusionUnit: true, // 标记为融合单位
        fusionRequirements: {
            units: ['fireSpear', 'lavaGuardian'], // 需要红缨枪和熔岩守护者融合
            level: 3 // 需要3级单位
        },
        ascendInteraction: true, // 标记可以升仙
        // 普通攻击：对攻击目标所在行以及所在列的所有对方单位造成当前攻击力100%的伤害
        normalAttack: (attacker, target) => {
            // 获取攻击者和目标的信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            const targetData = battleUnits.find(u => u.unit === target);
            
            if (!attackerData || !targetData) return attacker.attack;
            
            // 获取目标所在行和列
            const targetRow = Math.floor(targetData.index / 6);
            const targetCol = targetData.index % 6;
            
            // 对同行所有敌人造成伤害
            for (let i = 0; i < battleUnits.length; i++) {
                const potentialTarget = battleUnits[i];
                // 跳过同阵营单位、已死亡单位和当前目标（当前目标会在外部处理）
                if (potentialTarget.isEnemy === attackerData.isEnemy || 
                    potentialTarget.unit.currentHP <= 0 || 
                    potentialTarget.index === targetData.index) continue;
                
                // 检查是否在同一行或同一列
                const potentialRow = Math.floor(potentialTarget.index / 6);
                const potentialCol = potentialTarget.index % 6;
                
                if (potentialRow === targetRow || potentialCol === targetCol) {
                    // 造成伤害
                    const damage = attacker.attack;
                    const targetCell = document.querySelector(`.grid-cell[data-index="${potentialTarget.index}"]`);
                    
                    // 应用伤害
                    applyDamage(potentialTarget, damage, targetCell, attackerData);
                    
                    // 被攻击单位获得20点蓝量
                    potentialTarget.unit.mana = Math.min(300, potentialTarget.unit.mana + 20);
                }
            }
            
            return attacker.attack; // 返回普通攻击伤害
        },
        skill: {
            type: 'active',
            name: '无敌',
            description: '为自己添加"无敌"状态，抵挡下一次受到的伤害或者负面效果（无法行动、灼烧和中毒），抵挡后立即清除无敌状态',
            effect: (attacker) => {
                // 获取攻击者信息
                const attackerData = battleUnits.find(u => u.unit === attacker);
                if (!attackerData) return 0;
                
                // 添加无敌状态
                if (!attacker.statusEffects) {
                    attacker.statusEffects = {};
                }
                
                attacker.statusEffects.invincible = {
                    startTurn: battleTurn,
                    duration: 999, // 持续非常久，直到触发后移除
                    triggered: false // 标记是否已触发
                };
                
                // 添加视觉效果
                const attackerCell = document.querySelector(`.grid-cell[data-index="${attackerData.index}"]`);
                if (attackerCell) {
                    // 移除已有效果
                    const existingEffect = attackerCell.querySelector('.invincible-effect');
                    if (existingEffect) {
                        attackerCell.removeChild(existingEffect);
                    }
                    
                    // 添加无敌效果
                    const effectElement = document.createElement('div');
                    effectElement.className = 'invincible-effect';
                    effectElement.style.position = 'absolute';
                    effectElement.style.top = '0';
                    effectElement.style.left = '0';
                    effectElement.style.width = '100%';
                    effectElement.style.height = '100%';
                    effectElement.style.backgroundColor = 'rgba(255, 215, 0, 0.4)'; // 金色
                    effectElement.style.borderRadius = '5px';
                    effectElement.style.zIndex = '10';
                    effectElement.style.pointerEvents = 'none';
                    effectElement.style.animation = 'invincible-pulse 2s infinite';
                    attackerCell.appendChild(effectElement);
                    
                    // 显示技能效果
                    const invincibleIndicator = document.createElement('div');
                    invincibleIndicator.className = 'damage-number';
                    invincibleIndicator.style.color = '#FFD700'; // 金色
                    invincibleIndicator.style.fontSize = '16px';
                    invincibleIndicator.textContent = '无敌!';
                    attackerCell.appendChild(invincibleIndicator);
                    
                    setTimeout(() => {
                        if (attackerCell.contains(invincibleIndicator)) {
                            attackerCell.removeChild(invincibleIndicator);
                        }
                    }, 1500);
                }
                
                return 0; // 不造成伤害
            }
        }
    },

    // 圣战士可升仙为圣天使
    holyAngel: {
        hp: 2000,
        attack: 200,
        speed: 9,
        manaRegen: 50,
        color: '#FFD700', // 金色
        icon: '👼',
        job: 'warrior', // 战士职业
        name: '圣天使',
        inPool: 0, // 不在初始池中，只能通过升仙获得
        element: 'light',
        isTrap: false,
        // 普通攻击：对所有对方单位造成攻击力200%的伤害
        normalAttack: (attacker, target) => {
            // 获取攻击者信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            if (!attackerData) return attacker.attack * 2;
            
            // 对所有敌人造成伤害
            for (let i = 0; i < battleUnits.length; i++) {
                const enemyData = battleUnits[i];
                // 跳过同阵营单位和已死亡单位
                if (enemyData.isEnemy === attackerData.isEnemy || 
                    enemyData.unit.currentHP <= 0) continue;
                
                // 造成伤害
                const damage = attacker.attack * 2; // 200%攻击力
                const targetCell = document.querySelector(`.grid-cell[data-index="${enemyData.index}"]`);
                
                // 应用伤害（跳过当前目标，因为它会在外部被处理）
                if (enemyData.unit !== target) {
                    applyDamage(enemyData, damage, targetCell, attackerData);
                    
                    // 被攻击单位获得20点蓝量
                    enemyData.unit.mana = Math.min(300, enemyData.unit.mana + 20);
                }
            }
            
            return attacker.attack * 2; // 返回200%攻击伤害给当前目标
        },
        skill: {
            type: 'active',
            name: '圣盾',
            description: '为所有己方单位添加当前攻击力10%的护盾',
            shieldAmount: {},  // 存储每个单位的护盾值，格式为 {battleIndex: shieldValue}
            effect: function(attacker) {
                // 获取攻击者信息
                const attackerData = battleUnits.find(u => u.unit === attacker);
                if (!attackerData) return 0;
                
                // 对所有己方单位添加护盾
                for (let i = 0; i < battleUnits.length; i++) {
                    const allyData = battleUnits[i];
                    // 跳过敌方单位、已死亡单位
                    if (allyData.isEnemy !== attackerData.isEnemy || 
                        allyData.unit.currentHP <= 0) continue;
                    
                    // 计算护盾值为攻击力的10%
                    const shieldValue = Math.round(attacker.attack * 0.1);
                    
                    // 确保shieldAmount对象已初始化
                    if (!this.shieldAmount) {
                        this.shieldAmount = {};
                    }
                    
                    // 如果已有护盾，则叠加护盾值
                    if (this.shieldAmount[allyData.index]) {
                        this.shieldAmount[allyData.index] += shieldValue;
                    } else {
                        this.shieldAmount[allyData.index] = shieldValue;
                    }
                    
                    console.log(`圣天使技能：单位 ${allyData.unit.type} 在索引 ${allyData.index} 处获得护盾: ${this.shieldAmount[allyData.index]}`);
                    
                    // 更新护盾显示
                    this.updateShieldDisplay(allyData.index);
                    
                    // 显示护盾效果
                    const allyCell = document.querySelector(`.grid-cell[data-index="${allyData.index}"]`);
                    if (allyCell) {
                        const shieldEffect = document.createElement('div');
                        shieldEffect.className = 'damage-number';
                        shieldEffect.style.color = '#FFD700'; // 金色
                        shieldEffect.textContent = `+${shieldValue}🛡️`;
                        allyCell.appendChild(shieldEffect);
                        
                        setTimeout(() => {
                            if (allyCell.contains(shieldEffect)) {
                                allyCell.removeChild(shieldEffect);
                            }
                        }, 1000);
                    }
                }
                
                return 0; // 不造成伤害
            },
            updateShieldDisplay: function(unitIndex) {
                const cell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
                if (!cell) return;
                
                // 移除已有的护盾显示（如果有）
                const existingShield = cell.querySelector('.holy-shield');
                if (existingShield) {
                    cell.removeChild(existingShield);
                }
                
                // 如果有护盾值，添加护盾显示
                if (this.shieldAmount[unitIndex] && this.shieldAmount[unitIndex] > 0) {
                    const shieldElement = document.createElement('div');
                    shieldElement.className = 'holy-shield';
                    shieldElement.style.position = 'absolute';
                    shieldElement.style.top = '20px';
                    shieldElement.style.left = '2px';
                    shieldElement.style.fontSize = '10px';
                    shieldElement.style.color = '#FFD700'; // 金色
                    shieldElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
                    shieldElement.style.padding = '2px';
                    shieldElement.style.borderRadius = '3px';
                    shieldElement.style.zIndex = '5';
                    shieldElement.textContent = `🛡️${this.shieldAmount[unitIndex]}`;
                    cell.appendChild(shieldElement);
                    
                    // 添加护盾视觉效果
                    const shieldVisual = document.createElement('div');
                    shieldVisual.className = 'holy-shield-effect';
                    shieldVisual.style.position = 'absolute';
                    shieldVisual.style.top = '0';
                    shieldVisual.style.left = '0';
                    shieldVisual.style.width = '100%';
                    shieldVisual.style.height = '100%';
                    shieldVisual.style.border = '2px solid #FFD700';
                    shieldVisual.style.borderRadius = '5px';
                    shieldVisual.style.boxSizing = 'border-box';
                    shieldVisual.style.pointerEvents = 'none';
                    shieldVisual.style.zIndex = '1';
                    shieldVisual.style.animation = 'holy-shield-pulse 2s infinite';
                    cell.appendChild(shieldVisual);
                    
                    // 添加动画样式
                    if (!document.querySelector('#holy-shield-style')) {
                        const style = document.createElement('style');
                        style.id = 'holy-shield-style';
                        style.textContent = `
                            @keyframes holy-shield-pulse {
                                0% { opacity: 0.2; }
                                50% { opacity: 0.6; }
                                100% { opacity: 0.2; }
                            }
                        `;
                        document.head.appendChild(style);
                    }
                }
            },
            clearShield: function(unitIndex) {
                // 清除护盾值
                if (this.shieldAmount[unitIndex]) {
                    delete this.shieldAmount[unitIndex];
                }
                
                // 移除护盾显示
                const cell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
                if (cell) {
                    const shieldElement = cell.querySelector('.holy-shield');
                    if (shieldElement) {
                        cell.removeChild(shieldElement);
                    }
                    
                    const shieldEffect = cell.querySelector('.holy-shield-effect');
                    if (shieldEffect) {
                        cell.removeChild(shieldEffect);
                    }
                }
            },
            cleanupShields: function() {
                // 战斗结束时清理所有护盾
                for (const unitIndex in this.shieldAmount) {
                    this.clearShield(unitIndex);
                }
                // 重置护盾信息
                this.shieldAmount = {};
            }
        }
    },

    // 融合单位：暗夜女王（圣战士+雷霆射手融合）
    darkQueen: {
        hp: 8000,
        attack: 0,
        speed: 4,
        manaRegen: 40,
        color: '#7E57C2', // 电属性颜色
        icon: '👑',
        job: 'assassin', // 刺客职业
        name: '暗夜女王',
        inPool: 0, // 不在初始池中，只能通过融合获得
        element: 'dark',
        isTrap: false,
        isFusionUnit: true, // 标记为融合单位
        fusionRequirements: {
            units: ['holyWarrior', 'thunderArcher'], // 需要圣战士和雷霆射手融合
            level: 3 // 需要3级单位
        },
        sacrificeInteraction: true, // 标记具有献祭互动功能
        // 初始化蝙蝠数量
        batCount: 2, // 初始拥有2只蝙蝠
        attachedBats: {}, // 存储吸附在敌方单位上的蝙蝠信息，格式为 {targetIndex: true}
        
        // 普通攻击：连续N次对攻击目标造成当前攻击力100%的伤害，N等于拥有的蝙蝠数量
        normalAttack: (attacker, target) => {
            // 获取攻击者和目标的信息
            const attackerData = battleUnits.find(u => u.unit === attacker);
            const targetData = battleUnits.find(u => u.unit === target);
            
            if (!attackerData || !targetData) return attacker.attack;
            
            // 获取蝙蝠数量
            const batCount = attacker.batCount || 0;
            if (batCount <= 0) {
                return attacker.attack; // 如果没有蝙蝠，只进行一次普通攻击
            }
            
            // 显示多次攻击效果
            const targetCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
            if (targetCell) {
                const multiAttackEffect = document.createElement('div');
                multiAttackEffect.className = 'damage-number';
                multiAttackEffect.style.color = '#7E57C2'; // 紫色
                multiAttackEffect.style.fontSize = '16px';
                multiAttackEffect.textContent = `${batCount}连击!`;
                targetCell.appendChild(multiAttackEffect);
                
                setTimeout(() => {
                    if (targetCell.contains(multiAttackEffect)) {
                        targetCell.removeChild(multiAttackEffect);
                    }
                }, 1500);
            }
            
            // 标记为技能执行中，确保其他单位不会在此期间行动
            isSkillExecuting = true;
            
            // 目标列表，第一个是初始目标
            let targets = [targetData];
            
            // 定义连击函数
            const performBatAttack = (attackIndex) => {
                // 如果已完成所有连击，结束
                if (attackIndex >= batCount) {
                    isSkillExecuting = false;
                    return;
                }
                
                // 获取当前目标
                let currentTarget;
                
                // 第一次攻击使用用户指定的目标
                if (attackIndex === 0) {
                    currentTarget = targets[0];
                } else {
                    // 后续攻击寻找新目标（最远距离）
                    const newTarget = findFarthestTarget(attackerData.index, attackerData.isEnemy);
                    
                    // 如果找不到目标，结束连击
                    if (!newTarget) {
                        console.log('暗夜女王连击提前结束：没有可攻击的目标');
                        isSkillExecuting = false;
                        return;
                    }
                    
                    currentTarget = newTarget;
                    // 添加到目标列表中(避免重复攻击)
                    if (!targets.some(t => t.index === newTarget.index)) {
                        targets.push(newTarget);
                    }
                }
                
                // 获取目标单元格
                const currentTargetCell = document.querySelector(`.grid-cell[data-index="${currentTarget.index}"]`);
                if (!currentTargetCell) {
                    console.log('无法找到目标单元格');
                    isSkillExecuting = false;
                    return;
                }
                
                // 如果不是第一次攻击，显示新目标被攻击的效果
                if (attackIndex > 0) {
                    // 显示连击效果
                    const batEffect = document.createElement('div');
                    batEffect.className = 'damage-number';
                    batEffect.style.color = '#7E57C2'; // 紫色
                    batEffect.style.fontSize = '14px';
                    batEffect.textContent = '🦇攻击!';
                    currentTargetCell.appendChild(batEffect);
                    
                    setTimeout(() => {
                        if (currentTargetCell.contains(batEffect)) {
                            currentTargetCell.removeChild(batEffect);
                        }
                    }, 1000);
                }
                
                // 造成伤害
                const attackDamage = attacker.attack;
                applyDamage(currentTarget, attackDamage, currentTargetCell, attackerData);
                
                // 增加目标蓝量
                currentTarget.unit.mana = Math.min(300, currentTarget.unit.mana + 20);
                
                // 更新显示
                updateUnitDisplay(currentTarget.index);
                
                // 延迟执行下一次攻击
                setTimeout(() => {
                    performBatAttack(attackIndex + 1);
                }, 300);
            };
            
            // 开始执行连击
            performBatAttack(0);
            
            // 返回0，因为伤害已在连击函数中计算
            return 0;
        },
        
        // 被动技能：释放不超过对方单位总数的蝙蝠，每只随机吸附于对方单位
        passiveSkills: {
            batRelease: {
                name: '蝙蝠释放',
                description: '战斗开始时，释放蝙蝠随机吸附于对方单位',
                effect: (attacker) => {
                    // 获取攻击者信息
                    const attackerData = battleUnits.find(u => u.unit === attacker);
                    if (!attackerData) return;
                    
                    // 获取对方单位
                    const enemyUnits = battleUnits.filter(unitData => 
                        unitData.isEnemy !== attackerData.isEnemy && 
                        unitData.unit.currentHP > 0
                    );
                    
                    // 如果没有敌人，直接返回
                    if (enemyUnits.length === 0) return;
                    
                    // 获取蝙蝠数量，不超过敌方单位数量
                    const batCount = Math.min(attacker.batCount || 0, enemyUnits.length);
                    
                    // 随机分配蝙蝠
                    const availableEnemies = [...enemyUnits];
                    const attachedBats = {};
                    
                    for (let i = 0; i < batCount; i++) {
                        if (availableEnemies.length === 0) break;
                        
                        // 随机选择一个敌人
                        const randomIndex = Math.floor(Math.random() * availableEnemies.length);
                        const targetEnemy = availableEnemies[randomIndex];
                        
                        // 记录蝙蝠附着
                        attachedBats[targetEnemy.index] = true;
                        
                        // 显示蝙蝠附着效果
                        unitTypes.darkQueen.updateBatDisplay(targetEnemy.index, true);
                        
                        // 从可用敌人列表中移除该敌人
                        availableEnemies.splice(randomIndex, 1);
                    }
                    
                    // 保存附着信息
                    attacker.attachedBats = attachedBats;
                    
                    console.log(`暗夜女王释放了 ${batCount} 只蝙蝠吸附在敌方单位上`);
                },
                handleUnitDeath: (deadUnit, deadUnitIndex, attacker) => {
                    // 如果死亡的单位上有蝙蝠，则转移蝙蝠
                    if (attacker.attachedBats && attacker.attachedBats[deadUnitIndex]) {
                        // 移除蝙蝠显示
                        unitTypes.darkQueen.updateBatDisplay(deadUnitIndex, false);
                        
                        // 删除该单位的蝙蝠记录
                        delete attacker.attachedBats[deadUnitIndex];
                        
                        // 获取攻击者信息
                        const attackerData = battleUnits.find(u => u.unit === attacker);
                        if (!attackerData) return;
                        
                        // 查找未被吸附的敌方单位
                        const availableEnemies = battleUnits.filter(unitData => 
                            unitData.isEnemy !== attackerData.isEnemy && 
                            unitData.unit.currentHP > 0 && 
                            !attacker.attachedBats[unitData.index]
                        );
                        
                        // 如果没有可用敌人，蝙蝠回到暗夜女王处
                        if (availableEnemies.length === 0) {
                            console.log('没有可吸附的对象，蝙蝠回收');
                            return;
                        }
                        
                        // 随机选择一个敌人
                        const randomEnemy = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
                        
                        // 蝙蝠吸附到新敌人
                        attacker.attachedBats[randomEnemy.index] = true;
                        
                        // 显示蝙蝠吸附效果
                        unitTypes.darkQueen.updateBatDisplay(randomEnemy.index, true);
                        
                        console.log(`蝙蝠从死亡单位转移到索引 ${randomEnemy.index} 的单位上`);
                    }
                }
            }
        },
        
        // 主动技能：吸血，依次遍历被蝙蝠吸附的单位，减少它们的属性并加到自身
        skill: {
            type: 'active',
            name: '吸血',
            description: '对被蝙蝠吸附的所有敌方单位各减少5%初始血量和5%初始攻击力，并叠加至自身属性',
            effect: function(attacker) {
                // 获取攻击者信息
                const attackerData = battleUnits.find(u => u.unit === attacker);
                if (!attackerData) return 0;
                
                // 检查附着的蝙蝠
                if (!attacker.attachedBats) return 0;
                
                let totalHpDrain = 0;
                let totalAttackDrain = 0;
                
                // 遍历所有被蝙蝠吸附的单位
                for (const targetIndex in attacker.attachedBats) {
                    const targetData = battleUnits.find(u => u.index === parseInt(targetIndex));
                    if (!targetData || targetData.unit.currentHP <= 0) continue;
                    
                    const target = targetData.unit;
                    
                    // 计算5%初始血量和5%初始攻击力
                    const baseType = unitTypes[target.type];
                    let hpDrain = Math.round(baseType.hp * 0.05);
                    let attackDrain = Math.round(baseType.attack * 0.05);
                    
                    // 应用伤害和减少攻击力
                    target.currentHP = Math.max(1, target.currentHP - hpDrain); // 保留至少1点血量
                    target.attack = Math.max(0, target.attack - attackDrain);
                    
                    // 累计总吸取量
                    totalHpDrain += hpDrain;
                    totalAttackDrain += attackDrain;
                    
                    // 更新单位显示
                    updateUnitDisplay(targetData.index);
                    
                    // 显示吸血效果
                    const targetCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
                    if (targetCell) {
                        const drainEffect = document.createElement('div');
                        drainEffect.className = 'damage-number';
                        drainEffect.style.color = '#7E57C2'; // 紫色
                        drainEffect.textContent = '吸血!';
                        targetCell.appendChild(drainEffect);
                        
                        setTimeout(() => {
                            if (targetCell.contains(drainEffect)) {
                                targetCell.removeChild(drainEffect);
                            }
                        }, 1500);
                    }
                }
                
                // 将吸取的属性加到自身
                attacker.currentHP += totalHpDrain; // 血量可以无限叠加
                attacker.attack += totalAttackDrain;
                
                // 更新暗夜女王显示
                updateUnitDisplay(attackerData.index);
                
                // 显示增益效果
                const attackerCell = document.querySelector(`.grid-cell[data-index="${attackerData.index}"]`);
                if (attackerCell) {
                    const buffEffect = document.createElement('div');
                    buffEffect.className = 'damage-number';
                    buffEffect.style.color = '#7E57C2'; // 紫色
                    buffEffect.textContent = `+${totalHpDrain}❤️ +${totalAttackDrain}⚔️`;
                    attackerCell.appendChild(buffEffect);
                    
                    setTimeout(() => {
                        if (attackerCell.contains(buffEffect)) {
                            attackerCell.removeChild(buffEffect);
                        }
                    }, 1500);
                }
                
                return 0; // 不造成直接伤害
            }
        },
        
        // 更新蝙蝠显示
        updateBatDisplay: function(unitIndex, isAttach) {
            const cell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
            if (!cell) return;
            
            // 移除已有的蝙蝠显示（如果有）
            const existingBat = cell.querySelector('.bat-icon');
            if (existingBat) {
                cell.removeChild(existingBat);
            }
            
            // 如果是附着操作，添加蝙蝠图标
            if (isAttach) {
                const batElement = document.createElement('div');
                batElement.className = 'bat-icon';
                batElement.style.position = 'absolute';
                batElement.style.top = '45px'; // 在等级显示的上方
                batElement.style.left = '5px';
                batElement.style.fontSize = '12px';
                batElement.style.fontWeight = 'bold';
                batElement.style.color = '#7E57C2'; // 紫色
                batElement.style.textShadow = '0 0 3px black';
                batElement.style.zIndex = '5';
                batElement.textContent = '🦇';
                cell.appendChild(batElement);
            }
        },
        
        // 更新暗夜女王自身的蝙蝠数量显示
        updateOwnBatDisplay: function(unitIndex) {
            const cell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
            if (!cell) return;
            
            // 移除已有的蝙蝠数量显示（如果有）
            const existingBatCount = cell.querySelector('.bat-count');
            if (existingBatCount) {
                cell.removeChild(existingBatCount);
            }
            
            // 获取单位
            const unit = gameState.units.battleField[unitIndex];
            if (!unit || unit.type !== 'darkQueen') return;
            
            // 显示蝙蝠数量
            const batCountElement = document.createElement('div');
            batCountElement.className = 'bat-count';
            batCountElement.style.position = 'absolute';
            batCountElement.style.top = '45px'; // 在等级显示的上方
            batCountElement.style.left = '5px';
            batCountElement.style.fontSize = '12px';
            batCountElement.style.fontWeight = 'bold';
            batCountElement.style.color = '#7E57C2'; // 紫色
            batCountElement.style.backgroundColor = 'rgba(0,0,0,0.5)';
            batCountElement.style.padding = '2px';
            batCountElement.style.borderRadius = '3px';
            batCountElement.style.zIndex = '5';
            batCountElement.textContent = `🦇${unit.batCount || 0}`;
            cell.appendChild(batCountElement);
        },
        
        // 清理战斗结束时的蝙蝠
        cleanupBats: function() {
            // 清理所有单位上的蝙蝠显示
            for (let i = 0; i < gameState.units.battleField.length; i++) {
                const cell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                if (cell) {
                    const batElement = cell.querySelector('.bat-icon');
                    if (batElement) {
                        cell.removeChild(batElement);
                    }
                }
            }
            
            // 遍历所有暗夜女王单位，重置附着信息
            for (let i = 0; i < gameState.units.battleField.length; i++) {
                const unit = gameState.units.battleField[i];
                if (unit && unit.type === 'darkQueen') {
                    unit.attachedBats = {};
                    // 更新蝙蝠数量显示
                    this.updateOwnBatDisplay(i);
                }
            }
        }
    },

    // 添加机关类型定义

    // 稻草人
    scarecrow: {
        hp: 3,
        attack: 0,
        speed: 0,
        manaRegen: 0,
        color: '#FFA500',
        icon: '🧍',
        job: 'trap',
        name: '稻草人',
        inPool: 0, // 不会在商店随机出现
        element: 'Null',
        isTrap: true,
        // 稻草人被动技能：伤害固定为1
        passiveSkills: {
            damageReduction: {
                name: '稻草替身',
                description: '受到的任何伤害将为1点',
                effect: (damage) => {
                    return 1; // 无论受到多少伤害，都只受到1点
                }
            },
            // 伤害重定向技能
            damageRedirection: {
                name: '伤害重定向',
                description: '稻草人同列的我方普通单位受到伤害时，将由稻草人承担',
                // 检查是否可以重定向伤害
                canRedirect: (targetIndex, damage) => {
                    // 获取目标所在列
                    const targetCol = targetIndex % 6;
                    
                    // 查找同列的稻草人
                    for (let row = 4; row < 8; row++) { // 只检查我方区域
                        const scarecrowIndex = row * 6 + targetCol;
                        const unit = gameState.units.battleField[scarecrowIndex];
                        
                        // 如果找到稻草人，且稻草人有该技能
                        if (unit && unit.type === 'scarecrow' && unit.currentHP > 0 && 
                            gameState.traps.scarecrow.advancedSkills.damageRedirection) {
                            
                            // 显示重定向效果
                            const targetCell = document.querySelector(`.grid-cell[data-index="${targetIndex}"]`);
                            const scarecrowCell = document.querySelector(`.grid-cell[data-index="${scarecrowIndex}"]`);
                            
                            if (targetCell && scarecrowCell) {
                                // 创建重定向效果
                                const redirectEffect = document.createElement('div');
                                redirectEffect.className = 'damage-number';
                                redirectEffect.style.color = '#FFA500'; // 橙色
                                redirectEffect.textContent = '伤害重定向!';
                                targetCell.appendChild(redirectEffect);
                                
                                setTimeout(() => {
                                    if (targetCell.contains(redirectEffect)) {
                                        targetCell.removeChild(redirectEffect);
                                    }
                                }, 1000);
                                
                                // 对稻草人应用伤害
                                unit.currentHP = Math.max(0, unit.currentHP - 1); // 稻草人固定受到1点伤害
                                
                                // 更新稻草人显示
                                const hpElement = scarecrowCell.querySelector('.unit-hp');
                                if (hpElement) {
                                    hpElement.innerHTML = `❤️${Math.round(unit.currentHP)}`;
                                }
                                
                                // 如果稻草人死亡且有复活技能，标记为待复活
                                if (unit.currentHP <= 0 && gameState.traps.scarecrow.advancedSkills.resurrection) {
                                    unit.resurrectionCountdown = 3; // 3回合后复活
                                    
                                    // 显示复活倒计时
                                    const resurrectionEffect = document.createElement('div');
                                    resurrectionEffect.className = 'resurrection-countdown';
                                    resurrectionEffect.textContent = `复活: ${unit.resurrectionCountdown}`;
                                    scarecrowCell.appendChild(resurrectionEffect);
                                }
                                
                                return true; // 伤害已重定向
                            }
                        }
                    }
                    
                    return false; // 没有找到可以重定向的稻草人
                }
            },
            // 自我修复技能
            regeneration: {
                name: '自我修复',
                description: '每回合结束后，稻草人恢复1点血量',
                // 应用回血效果
                applyRegeneration: () => {
                    // 检查是否已解锁该技能
                    if (!gameState.traps.scarecrow.advancedSkills.regeneration) {
                        return;
                    }
                    
                    // 查找所有稻草人
                    for (let i = 0; i < gameState.units.battleField.length; i++) {
                        const unit = gameState.units.battleField[i];
                        if (unit && unit.type === 'scarecrow' && unit.currentHP > 0 && unit.currentHP < unit.maxHP) {
                            // 恢复1点血量
                            unit.currentHP += 1;
                            
                            // 显示恢复效果
                            const scarecrowCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                            if (scarecrowCell) {
                                const healEffect = document.createElement('div');
                                healEffect.className = 'damage-number';
                                healEffect.style.color = '#4CAF50'; // 绿色
                                healEffect.textContent = '+1';
                                scarecrowCell.appendChild(healEffect);
                                
                                setTimeout(() => {
                                    if (scarecrowCell.contains(healEffect)) {
                                        scarecrowCell.removeChild(healEffect);
                                    }
                                }, 1000);
                                
                                // 更新稻草人显示
                                const hpElement = scarecrowCell.querySelector('.unit-hp');
                                if (hpElement) {
                                    hpElement.innerHTML = `❤️${Math.round(unit.currentHP)}`;
                                }
                            }
                        }
                    }
                }
            },
            // 稻草重生技能
            resurrection: {
                name: '稻草重生',
                description: '稻草人血量为0时，3回合后满血复活',
                // 更新复活倒计时
                updateResurrectionCountdown: () => {
                    // 检查是否已解锁该技能
                    if (!gameState.traps.scarecrow.advancedSkills.resurrection) {
                        return;
                    }
                    
                    // 查找所有死亡的稻草人
                    for (let i = 0; i < gameState.units.battleField.length; i++) {
                        const unit = gameState.units.battleField[i];
                        if (unit && unit.type === 'scarecrow' && unit.currentHP <= 0 && unit.resurrectionCountdown > 0) {
                            // 减少倒计时
                            unit.resurrectionCountdown -= 1;
                            
                            // 更新倒计时显示
                            const scarecrowCell = document.querySelector(`.grid-cell[data-index="${i}"]`);
                            if (scarecrowCell) {
                                let countdownElement = scarecrowCell.querySelector('.resurrection-countdown');
                                if (!countdownElement) {
                                    countdownElement = document.createElement('div');
                                    countdownElement.className = 'resurrection-countdown';
                                    scarecrowCell.appendChild(countdownElement);
                                }
                                
                                countdownElement.textContent = `复活: ${unit.resurrectionCountdown}`;
                                
                                // 如果倒计时结束，复活稻草人
                                if (unit.resurrectionCountdown <= 0) {
                                    console.log(`稻草人(${i})复活倒计时结束，开始复活`);
                                    
                                    // 复活稻草人
                                    unit.currentHP = unit.maxHP;
                                    
                                    // 移除倒计时显示
                                    if (countdownElement) {
                                        scarecrowCell.removeChild(countdownElement);
                                    }
                                    
                                    // 显示复活效果
                                    const resurrectionEffect = document.createElement('div');
                                    resurrectionEffect.className = 'damage-number';
                                    resurrectionEffect.style.color = '#FFD700'; // 金色
                                    resurrectionEffect.style.fontSize = '16px';
                                    resurrectionEffect.textContent = '复活!';
                                    scarecrowCell.appendChild(resurrectionEffect);
                                    
                                    setTimeout(() => {
                                        if (scarecrowCell.contains(resurrectionEffect)) {
                                            scarecrowCell.removeChild(resurrectionEffect);
                                        }
                                    }, 1500);
                                    
                                    // 更新稻草人显示
                                    const hpElement = scarecrowCell.querySelector('.unit-hp');
                                    if (hpElement) {
                                        hpElement.innerHTML = `❤️${Math.round(unit.currentHP)}`;
                                    }
                                    
                                    // 恢复稻草人的显示
                                    scarecrowCell.style.opacity = '1';
                                    
                                    // 更新战斗单位列表中的稻草人状态
                                    const scarecrowBattleUnit = battleUnits.find(u => u.index === i);
                                    if (scarecrowBattleUnit) {
                                        scarecrowBattleUnit.unit.currentHP = unit.maxHP;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // 火药桶
    barrel: {
        hp: 1,
        attack: 50,
        speed: 0,
        manaRegen: 0,
        color: '#8B0000',
        icon: '💣',
        job: 'trap',
        name: '火药桶',
        inPool: 0, // 不会在商店随机出现
        element: 'Null',
        isTrap: true,
        // 火药桶死亡后爆炸
        passiveSkills: {
            explosion: {
                name: '爆炸',
                description: '死亡后对以自己为中心的九宫格内所有单位造成自己初始攻击力的伤害',
                effect: (unit, index) => {
                    // 获取爆炸九宫格范围内的所有单位
                    const row = Math.floor(index / 6);
                    const col = index % 6;
                    const targets = [];
                    
                    // 遍历九宫格
                    for (let r = Math.max(0, row - 1); r <= Math.min(7, row + 1); r++) {
                        for (let c = Math.max(0, col - 1); c <= Math.min(5, col + 1); c++) {
                            const targetIndex = r * 6 + c;
                            if (targetIndex !== index && targetIndex >= 0 && targetIndex < 48) {
                                const targetUnit = gameState.units.battleField[targetIndex];
                                if (targetUnit && targetUnit.currentHP > 0) {
                                    targets.push({
                                        unit: targetUnit,
                                        index: targetIndex,
                                        row: r,
                                        col: c
                                    });
                                }
                            }
                        }
                    }
                    
                    // 对范围内的所有单位造成伤害
                    for (let i = 0; i < targets.length; i++) {
                        const target = targets[i];
                        const targetCell = document.querySelector(`.grid-cell[data-index="${target.index}"]`);
                        
                        if (targetCell) {
                            // 显示爆炸效果
                            const explosionEffect = createEffectElement('burn-effect');
                            targetCell.appendChild(explosionEffect);
                            
                            // 添加爆炸文字
                            const explosionText = createDamageNumber('爆炸!', '#FF0000');
                            targetCell.appendChild(explosionText);
                            
                            setTimeout(() => {
                                if (targetCell.contains(explosionEffect)) {
                                    targetCell.removeChild(explosionEffect);
                                }
                                if (targetCell.contains(explosionText)) {
                                    targetCell.removeChild(explosionText);
                                }
                            }, 1500);
                            
                            // 应用伤害
                            const damage = unit.attack;
                            
                            // 将目标转换为battleUnits格式
                            const targetData = battleUnits.find(u => u.index === target.index);
                            if (targetData) {
                                // 记录伤害前的血量
                                const beforeHP = targetData.unit.currentHP;
                                
                                // 应用伤害
                                applyDamage(targetData, damage, targetCell);
                                
                                // 检查单位是否存活且火药桶有眩晕爆炸技能
                                if (targetData.unit.currentHP > 0 && 
                                    gameState.traps.barrel.advancedSkills && 
                                    gameState.traps.barrel.advancedSkills.stunExplosion) {
                                    
                                    // 30%概率添加无法行动状态
                                    if (Math.random() < 0.3) {
                                        // 添加无法行动状态
                                        if (!targetData.unit.statusEffects) {
                                            targetData.unit.statusEffects = {};
                                        }
                                        
                                        targetData.unit.statusEffects.cantAct = {
                                            duration: 3,  // 持续3回合
                                            startTurn: battleTurn  // 从当前回合开始计算
                                        };
                                        
                                        // 显示眩晕效果
                                        const stunText = createDamageNumber('眩晕!', '#FFD700');
                                        targetCell.appendChild(stunText);
                                        
                                        setTimeout(() => {
                                            if (targetCell.contains(stunText)) {
                                                targetCell.removeChild(stunText);
                                            }
                                        }, 1500);
                                        
                                        // 添加视觉效果
                                        const stunEffect = createEffectElement('stun-effect');
                                        targetCell.appendChild(stunEffect);
                                        
                                        // 3秒后移除视觉效果（仅视觉效果，状态依然存在）
                                        setTimeout(() => {
                                            if (targetCell.contains(stunEffect)) {
                                                targetCell.removeChild(stunEffect);
                                            }
                                        }, 3000);
                                    }
                                }
                                
                                // 检查单位是否存活且火药桶有冲击波技能
                                if (targetData.unit.currentHP > 0 && 
                                    gameState.traps.barrel.advancedSkills && 
                                    gameState.traps.barrel.advancedSkills.shockwave) {
                                    
                                    // 计算击退方向
                                    const rowDiff = target.row - row; // 目标行 - 火药桶行
                                    const colDiff = target.col - col; // 目标列 - 火药桶列
                                    
                                    // 计算目标位置
                                    const newRow = target.row + rowDiff;
                                    const newCol = target.col + colDiff;
                                    
                                    // 检查新位置是否有效（在战场范围内）
                                    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 6) {
                                        const newIndex = newRow * 6 + newCol;
                                        
                                        // 检查新位置是否为空，且不允许敌方单位移动到我方区域，我方单位移动到敌方区域
                                        const isValidMove = 
                                            gameState.units.battleField[newIndex] === null && 
                                            !((targetData.isEnemy && newIndex >= 24) || (!targetData.isEnemy && newIndex < 24));
                                        
                                        if (isValidMove) {
                                            // 显示击退效果
                                            const knockbackText = createDamageNumber('击退!', '#87CEEB');
                                            targetCell.appendChild(knockbackText);
                                            
                                            setTimeout(() => {
                                                if (targetCell.contains(knockbackText)) {
                                                    targetCell.removeChild(knockbackText);
                                                }
                                            }, 1000);
                                            
                                            // 从原位置移除单位
                                            gameState.units.battleField[target.index] = null;
                                            targetCell.innerHTML = '';
                                            targetCell.style.backgroundColor = target.index < 24 ? 'rgba(255, 82, 82, 0.1)' : 'rgba(79, 195, 247, 0.1)';
                                            
                                            // 更新battleUnits中的索引
                                            targetData.index = newIndex;
                                            
                                            // 在新位置放置同一个单位对象（不创建新对象）
                                            gameState.units.battleField[newIndex] = targetData.unit;
                                            
                                            // 更新战场显示
                                            updateBattlefieldDisplay();
                                            
                                            // 获取新单元格
                                            const newCell = document.querySelector(`.grid-cell[data-index="${newIndex}"]`);
                                            if (newCell) {
                                                // 显示移动效果
                                                const moveEffect = createEffectElement('move-effect');
                                                newCell.appendChild(moveEffect);
                                                
                                                setTimeout(() => {
                                                    if (newCell.contains(moveEffect)) {
                                                        newCell.removeChild(moveEffect);
                                                    }
                                                }, 1000);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            autoCharge: {
                name: '自动蓄力',
                description: '每回合结束后，攻击力增加10%并更新数值显示，5回合后，直接自爆',
                // 初始化蓄力计数器
                initCharge: (unit) => {
                    if (!unit.chargeCount) {
                        unit.chargeCount = 0;
                        unit.baseAttack = unit.attack; // 记录初始攻击力
                    }
                },
                // 更新蓄力状态
                updateCharge: (unit, index) => {
                    // 初始化蓄力计数器（如果不存在）
                    if (!unit.chargeCount) {
                        unitTypes.barrel.passiveSkills.autoCharge.initCharge(unit);
                    }
                    
                    // 增加蓄力计数
                    unit.chargeCount++;
                    
                    // 增加攻击力
                    unit.attack = Math.round(unit.baseAttack * (1 + unit.chargeCount * 0.1));
                    
                    // 获取单元格
                    const cell = document.querySelector(`.grid-cell[data-index="${index}"]`);
                    if (cell) {
                        // 显示蓄力效果
                        const chargeText = createDamageNumber(`蓄力+${unit.chargeCount}`, '#FFA500');
                        cell.appendChild(chargeText);
                        
                        setTimeout(() => {
                            if (cell.contains(chargeText)) {
                                cell.removeChild(chargeText);
                            }
                        }, 1500);
                        
                        // 更新攻击力显示
                        let attackElement = cell.querySelector('.unit-attack');
                        if (attackElement) {
                            attackElement.innerHTML = `${unitTypes.barrel.icon}${unit.attack}`;
                        } else {
                            attackElement = document.createElement('div');
                            attackElement.className = 'unit-attack';
                            attackElement.innerHTML = `${unitTypes.barrel.icon}${unit.attack}`;
                            cell.appendChild(attackElement);
                        }
                        
                        // 添加蓄力视觉效果
                        const chargeEffect = document.createElement('div');
                        chargeEffect.className = 'charge-effect';
                        chargeEffect.textContent = `${unit.chargeCount}/5`;
                        chargeEffect.style.position = 'absolute';
                        chargeEffect.style.bottom = '2px';
                        chargeEffect.style.right = '2px';
                        chargeEffect.style.backgroundColor = 'rgba(255, 165, 0, 0.7)';
                        chargeEffect.style.color = 'white';
                        chargeEffect.style.padding = '1px 3px';
                        chargeEffect.style.borderRadius = '3px';
                        chargeEffect.style.fontSize = '8px';
                        chargeEffect.style.zIndex = '10';
                        
                        // 移除旧的蓄力效果（如果存在）
                        const oldChargeEffect = cell.querySelector('.charge-effect');
                        if (oldChargeEffect) {
                            cell.removeChild(oldChargeEffect);
                        }
                        
                        cell.appendChild(chargeEffect);
                        
                        // 检查是否达到5回合，如果是则自爆
                        if (unit.chargeCount >= 5) {
                            // 显示自爆倒计时
                            const countdownText = createDamageNumber('自爆!', '#FF0000');
                            cell.appendChild(countdownText);
                            
                            setTimeout(() => {
                                if (cell.contains(countdownText)) {
                                    cell.removeChild(countdownText);
                                }
                                
                                // 查找该单位在battleUnits中的数据
                                const unitData = battleUnits.find(u => u.index === index);
                                if (unitData) {
                                    // 触发爆炸效果
                                    unitTypes.barrel.passiveSkills.explosion.effect(unit, index);
                                    
                                    // 移除火药桶
                                    gameState.units.battleField[index] = null;
                                    cell.innerHTML = '';
                                    cell.style.backgroundColor = index < 24 ? 'rgba(255, 82, 82, 0.1)' : 'rgba(79, 195, 247, 0.1)';
                                    
                                    // 从战斗单位列表中移除
                                    const unitIndex = battleUnits.findIndex(u => u.index === index);
                                    if (unitIndex !== -1) {
                                        battleUnits.splice(unitIndex, 1);
                                    }
                                }
                            }, 1000);
                        }
                    }
                }
            }
        }
    },

    // 连弩
    crossbow: {
        hp: 1,
        attack: 100,
        speed: 0,
        manaRegen: 0,
        color: '#A0522D',
        icon: '🏹',
        job: 'trap',
        name: '连弩',
        inPool: 0, // 不会在商店随机出现
        element: 'Null',
        isTrap: true,
        attackCount: 0, // 攻击计数，用于贯穿箭技能
        baseAttack: 100, // 基础攻击力，用于计算击杀加成
        killBoostCount: 0, // 击杀计数，用于击杀加成技能
        hasTransferredAttack: false, // 标记是否已经转移过攻击力
        attackTransferTargets: [], // 记录已转移攻击力的目标，格式：[{index: 目标索引, amount: 转移数值}]
        // 连弩自动攻击
        passiveSkills: {
            autoAttack: {
                name: '自动射击',
                description: '每次同列的我方单位发动攻击或技能时，连弩将寻找目标发动一次攻击',
                lastAttackTime: 0, // 上次攻击时间戳，防止短时间内重复触发
                effect: (unit, index, targetIndex) => {
                    // 获取当前时间
                    const now = Date.now();
                    
                    // 防止短时间内重复触发（冷却时间500ms）
                    if (now - unitTypes.crossbow.passiveSkills.autoAttack.lastAttackTime < 500) {
                        return;
                    }
                    
                    // 更新上次攻击时间
                    unitTypes.crossbow.passiveSkills.autoAttack.lastAttackTime = now;
                    
                    // 设置技能执行中标志，阻止其他单位攻击
                    isSkillExecuting = true;
                    
                    // 寻找目标
                    const target = findDefaultTarget(index, false);
                    
                    // 检查目标是否存在且存活
                    if (target && target.unit && target.unit.currentHP > 0) {
                        // 获取目标单元格和连弩单元格
                        const targetCell = document.querySelector(`.grid-cell[data-index="${target.index}"]`);
                        const crossbowCell = document.querySelector(`.grid-cell[data-index="${index}"]`);
                        
                        if (targetCell && crossbowCell) {
                            // 在连弩上显示准备攻击的效果
                            const prepareText = createDamageNumber('🏹准备中', '#A0522D');
                            crossbowCell.appendChild(prepareText);
                            
                            // 延迟0.5秒后显示攻击效果和造成伤害
                            setTimeout(() => {
                                // 移除准备攻击的效果
                                if (crossbowCell.contains(prepareText)) {
                                    crossbowCell.removeChild(prepareText);
                                }
                                
                                // 再次检查目标是否仍然存活
                                if (target.unit && target.unit.currentHP > 0) {
                                    // 检查是否需要使用贯穿箭
                                    let usePiercingArrow = false;
                                    // 增加攻击计数
                                    if (gameState.traps.crossbow.advancedSkills.piercingArrow) {
                                        unitTypes.crossbow.attackCount++;
                                        // 每3次攻击触发一次贯穿箭
                                        if (unitTypes.crossbow.attackCount > 3) {
                                            usePiercingArrow = true;
                                            unitTypes.crossbow.attackCount = 0;
                                        }
                                    }
                                    
                                    if (usePiercingArrow) {
                                        // 使用贯穿箭攻击
                                        performPiercingArrow(index, target);
                                    } else {
                                    // 创建箭矢动画效果
                                    const arrowEffect = document.createElement('div');
                                    arrowEffect.textContent = '➹';
                                    arrowEffect.style.position = 'absolute';
                                    arrowEffect.style.fontSize = '20px';
                                    arrowEffect.style.color = '#A0522D';
                                    arrowEffect.style.zIndex = '100';
                                    
                                    // 获取连弩和目标的位置
                                    const crossbowRect = crossbowCell.getBoundingClientRect();
                                    const targetRect = targetCell.getBoundingClientRect();
                                    
                                    // 设置箭矢初始位置
                                    arrowEffect.style.left = `${crossbowRect.left + crossbowRect.width/2}px`;
                                    arrowEffect.style.top = `${crossbowRect.top + crossbowRect.height/2}px`;
                                    
                                    // 添加到文档中
                                    document.body.appendChild(arrowEffect);
                                    
                                    // 箭矢飞行动画
                                    const animationDuration = 200; // 200ms飞行时间
                                    const startTime = Date.now();
                                    
                                    const animateArrow = () => {
                                        const elapsed = Date.now() - startTime;
                                        const progress = Math.min(elapsed / animationDuration, 1);
                                        
                                        // 计算当前位置
                                        const currentLeft = crossbowRect.left + (targetRect.left - crossbowRect.left) * progress + crossbowRect.width/2;
                                        const currentTop = crossbowRect.top + (targetRect.top - crossbowRect.top) * progress + crossbowRect.height/2;
                                        
                                        // 更新箭矢位置
                                        arrowEffect.style.left = `${currentLeft}px`;
                                        arrowEffect.style.top = `${currentTop}px`;
                                        
                                        // 如果动画未完成，继续
                                        if (progress < 1) {
                                            requestAnimationFrame(animateArrow);
                                        } else {
                                            // 动画完成，移除箭矢
                                            document.body.removeChild(arrowEffect);
                                            
                            // 显示攻击效果
                            const attackText = createDamageNumber('连弩!', '#A0522D');
                            targetCell.appendChild(attackText);
                            
                            setTimeout(() => {
                                if (targetCell.contains(attackText)) {
                                    targetCell.removeChild(attackText);
                                }
                                                    
                                                    // 攻击完成后，解除技能执行中状态
                                                    isSkillExecuting = false;
                            }, 1000);
                            
                            // 应用伤害
                            const damage = unit.attack;
                            applyDamage(target, damage, targetCell);
                        }
                                    };
                                    
                                    // 开始箭矢动画
                                    requestAnimationFrame(animateArrow);
                                    }
                                } else {
                                    // 如果目标不存在或已死亡，解除技能执行中状态
                                    isSkillExecuting = false;
                                }
                            }, 500);
                        } else {
                            // 如果单元格不存在，解除技能执行中状态
                            isSkillExecuting = false;
                        }
                    } else {
                        // 如果没有找到有效目标，解除技能执行中状态
                        isSkillExecuting = false;
                    }
                }
            }
        },
        // 重置攻击计数（战斗结束时调用）
        resetAttackCount: function() {
            unitTypes.crossbow.attackCount = 0;
        },
        // 重置击杀加成（战斗结束时调用）
        resetKillBoost: function() {
            unitTypes.crossbow.killBoostCount = 0;
            
            // 在战场上查找所有连弩单位，重置它们的攻击力
            for (let i = 0; i < gameState.units.battleField.length; i++) {
                const unit = gameState.units.battleField[i];
                if (unit && unit.type === 'crossbow') {
                    unit.attack = unitTypes.crossbow.baseAttack;
                    // 根据等级调整攻击力
                    if (gameState.traps.crossbow.level > 1) {
                        unit.attack += (gameState.traps.crossbow.level - 1) * 10;
                    }
                    // 更新单位显示
                    updateUnitDisplay(i);
                }
            }
        },
        // 应用击杀加成（击杀敌人时调用）
        applyKillBoost: function(crossbowUnit, index, killCount = 1) {
            if (!gameState.traps.crossbow.advancedSkills.killBoost) return;
            
            // 记录击杀次数
            unitTypes.crossbow.killBoostCount += killCount;
            
            // 计算新的攻击力
            const boostPercentage = 0.2 * killCount; // 每次击杀增加20%
            crossbowUnit.attack = Math.round(crossbowUnit.attack * (1 + boostPercentage));
            
            // 显示加成效果
            const crossbowCell = document.querySelector(`.grid-cell[data-index="${index}"]`);
            if (crossbowCell) {
                const boostText = createDamageNumber(`攻击+${Math.round(boostPercentage * 100)}%!`, '#FF4500');
                crossbowCell.appendChild(boostText);
                
                setTimeout(() => {
                    if (crossbowCell.contains(boostText)) {
                        crossbowCell.removeChild(boostText);
                    }
                }, 1500);
                
                // 更新单位显示
                updateUnitDisplay(index);
            }
        },
        // 转移攻击力（连弩被破坏时调用）
        transferAttack: function(crossbowUnit, index) {
            if (!gameState.traps.crossbow.advancedSkills.attackTransfer) return;
            
            // 检查是否已经转移过攻击力，如果是，则不再触发
            if (unitTypes.crossbow.hasTransferredAttack) return;
            
            // 计算要转移的攻击力
            const transferAttack = Math.round(crossbowUnit.attack * 0.5);
            if (transferAttack <= 0) return;
            
            // 获取连弩所在列
            const col = index % 6;
            
            // 查找同列的己方存活单位
            const allyUnits = [];
            for (let row = 4; row < 8; row++) { // 只在玩家区域(下半部分)查找
                const allyIndex = row * 6 + col;
                if (allyIndex === index) continue; // 排除连弩自身
                
                const allyUnit = gameState.units.battleField[allyIndex];
                if (allyUnit && allyUnit.currentHP > 0) {
                    allyUnits.push({
                        unit: allyUnit,
                        index: allyIndex
                    });
                }
            }
            
            // 如果没有找到存活的己方单位，技能不触发
            if (allyUnits.length === 0) return;
            
            // 随机选择一个己方单位
            const randomIndex = Math.floor(Math.random() * allyUnits.length);
            const targetAlly = allyUnits[randomIndex];
            
            // 增加目标单位的攻击力
            targetAlly.unit.attack += transferAttack;
            
            // 记录已转移攻击力的目标，以便战斗结束时移除
            unitTypes.crossbow.attackTransferTargets.push({
                index: targetAlly.index,
                amount: transferAttack
            });
            
            // 标记已经转移过攻击力
            unitTypes.crossbow.hasTransferredAttack = true;
            
            // 显示效果
            const crossbowCell = document.querySelector(`.grid-cell[data-index="${index}"]`);
            const allyCell = document.querySelector(`.grid-cell[data-index="${targetAlly.index}"]`);
            
            if (crossbowCell && allyCell) {
                // 连弩上显示攻击力转移效果
                const transferText = createDamageNumber(`转移攻击力!`, '#FF4500');
                crossbowCell.appendChild(transferText);
                
                setTimeout(() => {
                    if (crossbowCell.contains(transferText)) {
                        crossbowCell.removeChild(transferText);
                    }
                }, 1500);
                
                // 在目标单位上显示获得攻击力效果
                const boostText = createDamageNumber(`攻击+${transferAttack}!`, '#FF4500');
                allyCell.appendChild(boostText);
                
                setTimeout(() => {
                    if (allyCell.contains(boostText)) {
                        allyCell.removeChild(boostText);
                    }
                }, 1500);
                
                // 更新目标单位显示
                updateUnitDisplay(targetAlly.index);
            }
        },
        // 战斗结束时重置临终遗力效果
        resetAttackTransfer: function() {
            // 重置标记
            unitTypes.crossbow.hasTransferredAttack = false;
            
            // 移除转移的攻击力
            for (const target of unitTypes.crossbow.attackTransferTargets) {
                const unit = gameState.units.battleField[target.index];
                if (unit) {
                    unit.attack -= target.amount;
                    // 确保攻击力不会小于1
                    if (unit.attack < 1) unit.attack = 1;
                    // 更新显示
                    updateUnitDisplay(target.index);
                }
            }
            
            // 清空记录
            unitTypes.crossbow.attackTransferTargets = [];
        }
    },

    // 存钱罐
    piggyBank: {
        name: '存钱罐',
        element: 'earth',
        job: 'support',
        icon: '💰',
        color: '#8D6E63',
        hp: 1,
        attack: 0,
        speed: 0,
        manaRegen: 0,
        inPool: 0,
        isTrap: true,
        killCount: 0, // 击杀计数
        passiveSkills: {
            countKills: {
                name: '计数',
                description: '统计每次战斗中我方单位击杀的敌人数',
                effect: function(unit, enemyUnit, isPlayerKill) {
                    // 只有存钱罐血量大于0且是玩家击杀时才计数
                    if (unit.currentHP > 0 && isPlayerKill) {
                        unit.killCount++;
                        console.log(`存钱罐计数：${unit.killCount}`);
                        
                        // 每10个计数奖励1贝壳
                        if (unit.killCount >= 5) {
                            // 计算奖励数量
                            const rewardCount = unit.killCount;
                            const shellReward = rewardCount;
                            
                            // 添加贝壳
                            gameState.player.shells += shellReward;
                            shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
                            
                            // 显示奖励效果
                            const piggyBankIndex = findUnitIndexByType('piggyBank');
                            if (piggyBankIndex !== -1) {
                                const piggyBankCell = document.querySelector(`.grid-cell[data-index="${piggyBankIndex}"]`);
                                if (piggyBankCell) {
                                    const rewardText = document.createElement('div');
                                    rewardText.className = 'damage-number';
                                    rewardText.style.color = '#FFD700'; // 金色
                                    rewardText.textContent = `+${shellReward}🐚`;
                                    piggyBankCell.appendChild(rewardText);
                                    
                                    setTimeout(() => {
                                        if (piggyBankCell.contains(rewardText)) {
                                            piggyBankCell.removeChild(rewardText);
                                        }
                                    }, 1500);
                                }
                            }
                            
                            // 魔力激发技能：为随机己方单位增加蓝量
                            if (gameState.traps.piggyBank.advancedSkills && 
                                gameState.traps.piggyBank.advancedSkills.manaBoost) {
                                applyManaBoost();
                            }
                            
                            // 重置计数
                            unit.killCount = 0;
                            console.log('存钱罐奖励已发放，计数重置');
                        }
                        
                        // 更新计数显示
                        updatePiggyBankDisplay(unit);
                    }
                },
                
                // 存钱罐死亡时，计数减半
                onDeath: function(unit) {
                    if (unit.killCount > 0) {
                        unit.killCount = Math.floor(unit.killCount / 2);
                        console.log(`存钱罐死亡，计数减半：${unit.killCount}`);
                    }
                }
            },
            columnCounter: {
                name: '列计数',
                description: '每回合结束后，统计存钱罐同列的对方存活单位数量M，并使计数N加上M，然后判定是否满足奖励条件',
                effect: function(unit) {
                    // 获取存钱罐的位置
                    const piggyBankIndex = findUnitIndexByType('piggyBank');
                    if (piggyBankIndex === -1 || unit.currentHP <= 0) return;
                    
                    // 获取存钱罐所在列
                    const piggyBankCol = piggyBankIndex % 6;
                    
                    // 统计同列敌方存活单位数量
                    let enemyCount = 0;
                    for (let row = 0; row < 4; row++) { // 敌方区域为前4行
                        const enemyIndex = row * 6 + piggyBankCol;
                        const enemyUnit = gameState.units.battleField[enemyIndex];
                        if (enemyUnit && enemyUnit.currentHP > 0) {
                            enemyCount++;
                        }
                    }
                    
                    if (enemyCount > 0) {
                        // 增加计数
                        unit.killCount += enemyCount;
                        console.log(`存钱罐列计数：同列有${enemyCount}个敌方单位，总计数增加到${unit.killCount}`);
                        
                        // 显示计数增加效果
                        const piggyBankCell = document.querySelector(`.grid-cell[data-index="${piggyBankIndex}"]`);
                        if (piggyBankCell) {
                            const countText = document.createElement('div');
                            countText.className = 'damage-number';
                            countText.style.color = '#4CAF50'; // 绿色
                            countText.textContent = `+${enemyCount}`;
                            piggyBankCell.appendChild(countText);
                            
                            setTimeout(() => {
                                if (piggyBankCell.contains(countText)) {
                                    piggyBankCell.removeChild(countText);
                                }
                            }, 1500);
                        }
                        
                        // 每5个计数奖励1贝壳
                        if (unit.killCount >= 5) {
                            // 计算奖励数量
                            const rewardCount = Math.floor(unit.killCount / 5);
                            const shellReward = rewardCount;
                            
                            // 添加贝壳
                            gameState.player.shells += shellReward;
                            shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
                            
                            // 显示奖励效果
                            if (piggyBankCell) {
                                const rewardText = document.createElement('div');
                                rewardText.className = 'damage-number';
                                rewardText.style.color = '#FFD700'; // 金色
                                rewardText.textContent = `+${shellReward}🐚`;
                                piggyBankCell.appendChild(rewardText);
                                
                                setTimeout(() => {
                                    if (piggyBankCell.contains(rewardText)) {
                                        piggyBankCell.removeChild(rewardText);
                                    }
                                }, 1500);
                            }
                            
                            // 魔力激发技能：为随机己方单位增加蓝量
                            if (gameState.traps.piggyBank.advancedSkills && 
                                gameState.traps.piggyBank.advancedSkills.manaBoost) {
                                applyManaBoost();
                            }
                            
                            // 重置计数
                            unit.killCount = 0;
                            console.log('存钱罐奖励已发放，计数重置');
                        }
                        
                        // 更新计数显示
                        updatePiggyBankDisplay(unit);
                    }
                }
            },
            healthBoost: {
                name: '储蓄强化',
                description: '战斗开始时，存钱罐根据当前计数N，血量立即增加N/2',
                effect: function(unit) {
                    if (unit.killCount > 0) {
                        // 计算血量增加值
                        const healthBoost = Math.floor(unit.killCount / 2);
                        
                        // 增加最大血量和当前血量
                        unit.maxHP += healthBoost;
                        unit.currentHP += healthBoost;
                        
                        console.log(`存钱罐储蓄强化：基于${unit.killCount}计数，增加${healthBoost}点血量，当前血量${unit.currentHP}/${unit.maxHP}`);
                        
                        // 显示血量增加效果
                        const piggyBankIndex = findUnitIndexByType('piggyBank');
                        if (piggyBankIndex !== -1) {
                            const piggyBankCell = document.querySelector(`.grid-cell[data-index="${piggyBankIndex}"]`);
                            if (piggyBankCell) {
                                const boostText = document.createElement('div');
                                boostText.className = 'damage-number';
                                boostText.style.color = '#FF69B4'; // 粉色
                                boostText.textContent = `+${healthBoost}❤️`;
                                piggyBankCell.appendChild(boostText);
                                
                                setTimeout(() => {
                                    if (piggyBankCell.contains(boostText)) {
                                        piggyBankCell.removeChild(boostText);
                                    }
                                }, 1500);
                                
                                // 更新单位显示
                                updateUnitDisplay(piggyBankIndex);
                            }
                        }
                    }
                }
            }
        }
    },

    // 圣旗
    holyFlag: {
        name: '圣旗',
        element: 'water',
        job: 'support',
        icon: '🚩',
        color: '#4FC3F7',
        hp: 1,
        attack: 0,
        speed: 0,
        manaRegen: 0,
        inPool: 0,
        isTrap: true,
        passiveSkills: {
            healing: {
                name: '恢复',
                description: '圣旗为中心的九宫格内所有己方单位（不包括自己）在受到伤害时，立即恢复初始血量的5%',
                effect: function(unit, targetUnit, damage) {
                    // 计算恢复量
                    const healPercent = 5 + (unit.level - 1) * 5; // 基础5%，每级+5%
                    const healAmount = Math.round(targetUnit.maxHP * healPercent / 100);
                    
                    // 应用恢复效果
                    targetUnit.currentHP = Math.min(targetUnit.currentHP + healAmount, targetUnit.maxHP);
                    
                    // 显示恢复效果
                    const targetIndex = findUnitIndexByUnit(targetUnit);
                    if (targetIndex !== -1) {
                        const targetCell = document.querySelector(`.grid-cell[data-index="${targetIndex}"]`);
                        if (targetCell) {
                            const healText = createDamageNumber(`+${healAmount}`, '#4CAF50');
                            targetCell.appendChild(healText);
                            
                            setTimeout(() => {
                                if (targetCell.contains(healText)) {
                                    targetCell.removeChild(healText);
                                }
                            }, 1000);
                        }
                    }
                    
                    // 更新单位显示
                    updateUnitDisplay(targetIndex);
                    
                    return healAmount;
                },
                
                // 检查单位是否在圣旗九宫格范围内
                isInRange: function(flagIndex, unitIndex) {
                    const flagRow = Math.floor(flagIndex / 6);
                    const flagCol = flagIndex % 6;
                    const unitRow = Math.floor(unitIndex / 6);
                    const unitCol = unitIndex % 6;
                    
                    // 检查是否在九宫格内
                    return Math.abs(flagRow - unitRow) <= 1 && Math.abs(flagCol - unitCol) <= 1;
                }
            },
            // 名刀技能
            namedBlade: {
                name: '名刀',
                description: '圣旗存活时，其九宫格范围内的所有己方单位获得"名刀"效果，即首次受到致命伤害时，血量变为1',
                // 检查单位是否在圣旗九宫格范围内且拥有名刀效果
                checkNamedBladeEffect: function(unitIndex) {
                    // 检查游戏状态是否初始化
                    if (!gameState || !gameState.traps) {
                        return false;
                    }
                    
                    // 检查圣旗是否存在并初始化
                    if (!gameState.traps.holyFlag) {
                        return false;
                    }
                    
                    // 检查圣旗高级技能是否初始化
                    if (!gameState.traps.holyFlag.advancedSkills) {
                        gameState.traps.holyFlag.advancedSkills = {};
                        return false;
                    }
                    
                    // 检查是否已购买名刀技能
                    if (!gameState.traps.holyFlag.advancedSkills.namedBlade) {
                        return false;
                    }
                    
                    // 检查battleUnits是否已初始化
                    if (!battleUnits || !Array.isArray(battleUnits)) {
                        return false;
                    }
                    
                    // 查找场上所有圣旗
                    for (let i = 0; i < battleUnits.length; i++) {
                        const flagData = battleUnits[i];
                        if (flagData && flagData.unit && flagData.unit.type === 'holyFlag' && 
                            !flagData.isEnemy && flagData.unit.currentHP > 0) {
                            
                            // 检查目标是否在圣旗九宫格范围内
                            if (unitTypes.holyFlag.passiveSkills.healing.isInRange(flagData.index, unitIndex)) {
                                return true;
                            }
                        }
                    }
                    
                    return false;
                },
                
                // 应用名刀效果，将单位血量设为1
                applyNamedBladeEffect: function(unit, unitIndex) {
                    // 设置单位血量为1
                    unit.currentHP = 1;
                    
                    // 标记该单位已使用过名刀效果
                    unit.namedBladeUsed = true;
                    
                    // 显示名刀效果
                    const unitCell = document.querySelector(`.grid-cell[data-index="${unitIndex}"]`);
                    if (unitCell) {
                        const effectText = createDamageNumber('名刀!', '#FFD700');
                        unitCell.appendChild(effectText);
                        
                        setTimeout(() => {
                            if (unitCell.contains(effectText)) {
                                unitCell.removeChild(effectText);
                            }
                        }, 1500);
                        
                        // 添加名刀视觉效果
                        const bladeEffect = document.createElement('div');
                        bladeEffect.className = 'named-blade-effect';
                        bladeEffect.style.position = 'absolute';
                        bladeEffect.style.top = '0';
                        bladeEffect.style.left = '0';
                        bladeEffect.style.width = '100%';
                        bladeEffect.style.height = '100%';
                        bladeEffect.style.backgroundColor = 'rgba(255, 215, 0, 0.3)';
                        bladeEffect.style.borderRadius = '5px';
                        bladeEffect.style.pointerEvents = 'none';
                        bladeEffect.style.zIndex = '5';
                        unitCell.appendChild(bladeEffect);
                        
                        // 2秒后移除视觉效果
                        setTimeout(() => {
                            if (unitCell.contains(bladeEffect)) {
                                unitCell.removeChild(bladeEffect);
                            }
                        }, 2000);
                    }
                    
                    // 更新单位显示
                    updateUnitDisplay(unitIndex);
                    
                    console.log(`单位(${unitIndex})触发名刀效果，血量变为1`);
                }
            },
            // 团结之力技能
            unityStrength: {
                name: '团结之力',
                description: '战斗开始时，统计圣旗所在九宫格内的己方单位数量M，并立即为圣旗血量增加M/3',
                
                // 应用团结之力效果
                effect: function(unit, flagIndex) {
                    try {
                        // 检查是否已购买团结之力技能
                        if (!gameState.traps.holyFlag.advancedSkills || 
                            !gameState.traps.holyFlag.advancedSkills.unityStrength) {
                            return;
                        }
                        
                        console.log(`圣旗团结之力开始计数，flagIndex=${flagIndex}`);
                        console.log(`battleUnits长度=${battleUnits.length}`);
                        
                        // 统计九宫格内的己方单位数量
                        let allyCount = 0;
                        
                        // 计算圣旗的行列位置
                        const flagRow = Math.floor(flagIndex / 6);
                        const flagCol = flagIndex % 6;
                        console.log(`圣旗位置: 行=${flagRow}, 列=${flagCol}`);
                        
                        // 遍历所有单位
                        for (let i = 0; i < battleUnits.length; i++) {
                            const allyData = battleUnits[i];
                            
                            // 跳过敌方单位、已死亡单位和圣旗自身
                            if (allyData.isEnemy || allyData.unit.currentHP <= 0 || allyData.index === flagIndex) {
                                continue;
                            }
                            
                            // 计算单位的行列位置
                            const allyRow = Math.floor(allyData.index / 6);
                            const allyCol = allyData.index % 6;
                            console.log(`检查单位(${allyData.index}): 行=${allyRow}, 列=${allyCol}`);
                            
                            // 检查是否在九宫格内
                            if (Math.abs(flagRow - allyRow) <= 1 && Math.abs(flagCol - allyCol) <= 1) {
                                allyCount++;
                                console.log(`单位(${allyData.index})在九宫格内，当前计数: ${allyCount}`);
                            }
                        }
                        
                        console.log(`圣旗九宫格内己方单位总数: ${allyCount}`);
                        
                        // 计算血量增加值
                        const hpBoost = Math.floor(allyCount / 3);
                        
                        if (hpBoost > 0) {
                            // 增加圣旗血量
                            unit.maxHP += hpBoost;
                            unit.currentHP += hpBoost;
                            
                            // 显示增益效果
                            const flagCell = document.querySelector(`.grid-cell[data-index="${flagIndex}"]`);
                            if (flagCell) {
                                const boostText = createDamageNumber(`团结+${hpBoost}`, '#4FC3F7');
                                flagCell.appendChild(boostText);
                                
                                setTimeout(() => {
                                    if (flagCell.contains(boostText)) {
                                        flagCell.removeChild(boostText);
                                    }
                                }, 2000);
                                
                                // 添加团结之力视觉效果
                                const unityEffect = document.createElement('div');
                                unityEffect.className = 'unity-effect';
                                unityEffect.style.position = 'absolute';
                                unityEffect.style.top = '0';
                                unityEffect.style.left = '0';
                                unityEffect.style.width = '100%';
                                unityEffect.style.height = '100%';
                                unityEffect.style.backgroundColor = 'rgba(79, 195, 247, 0.3)';
                                unityEffect.style.borderRadius = '5px';
                                unityEffect.style.pointerEvents = 'none';
                                unityEffect.style.zIndex = '5';
                                flagCell.appendChild(unityEffect);
                                
                                // 2秒后移除视觉效果
                                setTimeout(() => {
                                    if (flagCell.contains(unityEffect)) {
                                        flagCell.removeChild(unityEffect);
                                    }
                                }, 2000);
                            }
                            
                            // 更新单位显示
                            updateUnitDisplay(flagIndex);
                            
                            console.log(`圣旗(${flagIndex})触发团结之力效果，血量增加${hpBoost}点`);
                        }
                    } catch (error) {
                        console.error("团结之力效果触发错误:", error);
                    }
                }
            },
            // 复苏之光技能
            resurrectionLight: {
                name: '复苏之光',
                description: '战斗开始后的每5个回合，检查圣旗所在九宫格是否存在己方阵亡的单位，若存在立即随机复活1名，恢复其初始血量20%',
                
                // 检查是否应该触发复苏之光效果（每5回合触发一次）
                shouldTrigger: function() {
                    // 检查是否已购买复苏之光技能
                    if (!gameState || !gameState.traps || !gameState.traps.holyFlag || 
                        !gameState.traps.holyFlag.advancedSkills || 
                        !gameState.traps.holyFlag.advancedSkills.resurrectionLight) {
                        return false;
                    }
                    
                    // 检查回合数是否是5的倍数（从第5回合开始）
                    return battleTurn > 0 && battleTurn % 5 === 0;
                },
                
                // 应用复苏之光效果
                effect: function() {
                    try {
                        console.log(`检查是否触发复苏之光效果，当前回合: ${battleTurn}`);
                        
                        // 查找场上所有圣旗
                        for (let i = 0; i < battleUnits.length; i++) {
                            const flagData = battleUnits[i];
                            if (!flagData || !flagData.unit || flagData.unit.type !== 'holyFlag' || 
                                flagData.isEnemy || flagData.unit.currentHP <= 0) {
                                continue;
                            }
                            
                            const flagIndex = flagData.index;
                            console.log(`找到圣旗，位置索引: ${flagIndex}`);
                            
                            // 计算圣旗的行列位置
                            const flagRow = Math.floor(flagIndex / 6);
                            const flagCol = flagIndex % 6;
                            
                            // 查找九宫格内的己方阵亡单位
                            const deadAllies = [];
                            for (let j = 0; j < 48; j++) {
                                // 跳过敌方区域
                                if (j < 24) continue;
                                
                                const unit = gameState.units.battleField[j];
                                if (!unit || unit.currentHP > 0 || unit.type === 'holyFlag') continue;
                                
                                // 计算单位的行列位置
                                const unitRow = Math.floor(j / 6);
                                const unitCol = j % 6;
                                
                                // 检查是否在九宫格内
                                if (Math.abs(flagRow - unitRow) <= 1 && Math.abs(flagCol - unitCol) <= 1) {
                                    deadAllies.push({
                                        unit: unit,
                                        index: j
                                    });
                                }
                            }
                            
                            console.log(`圣旗九宫格内阵亡单位数量: ${deadAllies.length}`);
                            
                            // 如果有阵亡单位，随机选择一个复活
                            if (deadAllies.length > 0) {
                                const randomDeadAlly = deadAllies[Math.floor(Math.random() * deadAllies.length)];
                                const resurrectionUnit = randomDeadAlly.unit;
                                const resurrectionIndex = randomDeadAlly.index;
                                
                                // 恢复初始血量的20%
                                const healAmount = Math.round(resurrectionUnit.maxHP * 0.2);
                                resurrectionUnit.currentHP = healAmount;
                                
                                // 显示复活效果
                                const unitCell = document.querySelector(`.grid-cell[data-index="${resurrectionIndex}"]`);
                                if (unitCell) {
                                    // 恢复单位显示
                                    unitCell.style.opacity = '1';
                                    
                                    // 显示复活效果
                                    const resurrectionEffect = document.createElement('div');
                                    resurrectionEffect.className = 'resurrection-effect';
                                    resurrectionEffect.style.position = 'absolute';
                                    resurrectionEffect.style.top = '0';
                                    resurrectionEffect.style.left = '0';
                                    resurrectionEffect.style.width = '100%';
                                    resurrectionEffect.style.height = '100%';
                                    resurrectionEffect.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
                                    resurrectionEffect.style.borderRadius = '5px';
                                    resurrectionEffect.style.pointerEvents = 'none';
                                    resurrectionEffect.style.zIndex = '5';
                                    unitCell.appendChild(resurrectionEffect);
                                    
                                    // 显示复活数值
                                    const resurrectionText = createDamageNumber(`复活 +${healAmount}`, '#4CAF50');
                                    unitCell.appendChild(resurrectionText);
                                    
                                    // 2秒后移除视觉效果
                                    setTimeout(() => {
                                        if (unitCell.contains(resurrectionEffect)) {
                                            unitCell.removeChild(resurrectionEffect);
                                        }
                                        if (unitCell.contains(resurrectionText)) {
                                            unitCell.removeChild(resurrectionText);
                                        }
                                    }, 2000);
                                }
                                
                                // 更新单位显示
                                updateUnitDisplay(resurrectionIndex);
                                
                                // 将复活的单位添加回战斗单位列表
                                const existingUnit = battleUnits.find(u => u.index === resurrectionIndex);
                                if (!existingUnit) {
                                    battleUnits.push({
                                        unit: resurrectionUnit,
                                        index: resurrectionIndex,
                                        isEnemy: false,
                                        hasAttacked: true // 本回合不能行动
                                    });
                                } else {
                                    // 如果单位已在列表中，更新其状态
                                    existingUnit.unit.currentHP = healAmount;
                                    existingUnit.hasAttacked = true; // 本回合不能行动
                                }
                                
                                console.log(`圣旗(${flagIndex})触发复苏之光效果，复活单位(${resurrectionIndex})，恢复血量${healAmount}`);
                                
                                // 在圣旗上显示技能触发效果
                                const flagCell = document.querySelector(`.grid-cell[data-index="${flagIndex}"]`);
                                if (flagCell) {
                                    const lightEffect = document.createElement('div');
                                    lightEffect.className = 'light-effect';
                                    lightEffect.style.position = 'absolute';
                                    lightEffect.style.top = '0';
                                    lightEffect.style.left = '0';
                                    lightEffect.style.width = '100%';
                                    lightEffect.style.height = '100%';
                                    lightEffect.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
                                    lightEffect.style.borderRadius = '5px';
                                    lightEffect.style.pointerEvents = 'none';
                                    lightEffect.style.zIndex = '5';
                                    flagCell.appendChild(lightEffect);
                                    
                                    // 2秒后移除视觉效果
                                    setTimeout(() => {
                                        if (flagCell.contains(lightEffect)) {
                                            flagCell.removeChild(lightEffect);
                                        }
                                    }, 2000);
                                }
                            }
                        }
                    } catch (error) {
                        console.error("复苏之光效果触发错误:", error);
                    }
                }
            }
        }
    }
};

// Element weakness relationships
const weaknesses = {
    fire: 'water',
    water: 'electric',
    electric: 'earth',
    earth: 'grass',
    grass: 'fire',
    ice: 'flame',
    flame: 'ice',
    ice: 'wind',
    wind: 'rock',
    rock: 'wood',
    wood: 'flame',
    light: 'dark',
    dark: 'light'
};

// Helper function to update damage number style
function createDamageNumber(text, color) {
    const damageNumber = document.createElement('div');
    damageNumber.className = 'damage-number';
    damageNumber.textContent = text;
    
    if (color) {
        damageNumber.style.color = color;
    }
    
    return damageNumber;
}

// Helper function to create effect element
function createEffectElement(className) {
    const effectElement = document.createElement('div');
    effectElement.className = className;
    return effectElement;
}

// 查找指定类型单位的索引
function findUnitIndexByType(type) {
    for (let i = 0; i < gameState.units.battleField.length; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && unit.type === type) {
            return i;
        }
    }
    return -1;
}

// 更新存钱罐显示
function updatePiggyBankDisplay(unit) {
    const piggyBankIndex = findUnitIndexByType('piggyBank');
    if (piggyBankIndex !== -1) {
        const piggyBankCell = document.querySelector(`.grid-cell[data-index="${piggyBankIndex}"]`);
        if (piggyBankCell) {
            // 移除旧的计数显示
            const oldCounter = piggyBankCell.querySelector('.piggy-counter');
            if (oldCounter) {
                piggyBankCell.removeChild(oldCounter);
            }
            
            // 添加新的计数显示
            const counterElement = document.createElement('div');
            counterElement.className = 'piggy-counter';
            counterElement.style.position = 'absolute';
            counterElement.style.bottom = '2px';
            counterElement.style.right = '2px';
            counterElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
            counterElement.style.color = '#FFD700';
            counterElement.style.borderRadius = '50%';
            counterElement.style.width = '20px';
            counterElement.style.height = '20px';
            counterElement.style.display = 'flex';
            counterElement.style.justifyContent = 'center';
            counterElement.style.alignItems = 'center';
            counterElement.style.fontSize = '14px';
            counterElement.textContent = unit.killCount;
            piggyBankCell.appendChild(counterElement);
        }
    }
}

// 根据单位对象查找其在战场上的索引
function findUnitIndexByUnit(unit) {
    return gameState.units.battleField.findIndex(u => u === unit);
}

// 执行贯穿箭攻击，对目标所在列的所有敌方单位造成伤害
function performPiercingArrow(attackerIndex, target) {
    const crossbowUnit = gameState.units.battleField[attackerIndex];
    if (!crossbowUnit) {
        isSkillExecuting = false; // 如果连弩单位不存在，解除技能执行中状态
        return;
    }
    
    const targetCol = target.index % 6;
    const crossbowCell = document.querySelector(`.grid-cell[data-index="${attackerIndex}"]`);
    
    // 创建贯穿箭的特殊效果
    const piercingEffect = createEffectElement('piercing-arrow-effect');
    piercingEffect.textContent = '⟱'; // 下箭头表示贯穿
    piercingEffect.style.color = '#FF4500'; // 明亮的橙红色
    piercingEffect.style.fontSize = '24px';
    crossbowCell.appendChild(piercingEffect);
    
    setTimeout(() => {
        if (crossbowCell.contains(piercingEffect)) {
            crossbowCell.removeChild(piercingEffect);
        }
        
        // 显示贯穿箭特效
        const piercingText = createDamageNumber('贯穿箭!', '#FF4500');
        crossbowCell.appendChild(piercingText);
        
        setTimeout(() => {
            if (crossbowCell.contains(piercingText)) {
                crossbowCell.removeChild(piercingText);
            }
        }, 1000);
        
        // 查找目标列的所有敌方单位
        const targets = [];
        for (let row = 0; row < 8; row++) {
            const index = row * 6 + targetCol;
            const unit = gameState.units.battleField[index];
            
            // 确保只对敌方单位造成伤害
            // 连弩在下半部分(玩家区域)，因此只攻击上半部分(敌方区域)的单位
            if (unit && unit.currentHP > 0 && index < 24) {
                targets.push({
                    unit: unit,
                    index: index
                });
            }
        }
        
        // 如果没有找到有效目标，直接解除技能执行中状态
        if (targets.length === 0) {
            isSkillExecuting = false;
            return;
        }
        
        // 跟踪已完成的目标数量和击杀的目标数量
        let completedTargets = 0;
        let killedTargets = 0;
        
        // 对每个找到的目标造成伤害
        targets.forEach(targetData => {
            const targetCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
            if (targetCell) {
                // 创建箭矢动画效果
                const arrowEffect = document.createElement('div');
                arrowEffect.textContent = '⇓'; // 粗下箭头
                arrowEffect.style.position = 'absolute';
                arrowEffect.style.fontSize = '22px';
                arrowEffect.style.color = '#FF4500';
                arrowEffect.style.zIndex = '100';
                
                // 获取连弩和目标的位置
                const crossbowRect = crossbowCell.getBoundingClientRect();
                const targetRect = targetCell.getBoundingClientRect();
                
                // 设置箭矢初始位置
                arrowEffect.style.left = `${crossbowRect.left + crossbowRect.width/2}px`;
                arrowEffect.style.top = `${crossbowRect.top + crossbowRect.height/2}px`;
                
                // 添加到文档中
                document.body.appendChild(arrowEffect);
                
                // 箭矢飞行动画
                const animationDuration = 300; // 300ms飞行时间，比普通攻击稍长
                const startTime = Date.now();
                
                const animateArrow = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / animationDuration, 1);
                    
                    // 计算当前位置
                    const currentLeft = crossbowRect.left + (targetRect.left - crossbowRect.left) * progress + crossbowRect.width/2;
                    const currentTop = crossbowRect.top + (targetRect.top - crossbowRect.top) * progress + crossbowRect.height/2;
                    
                    // 更新箭矢位置
                    arrowEffect.style.left = `${currentLeft}px`;
                    arrowEffect.style.top = `${currentTop}px`;
                    
                    // 如果动画未完成，继续
                    if (progress < 1) {
                        requestAnimationFrame(animateArrow);
                    } else {
                        // 动画完成，移除箭矢
                        document.body.removeChild(arrowEffect);
                        
                        // 显示攻击效果
                        const attackText = createDamageNumber('贯穿!', '#FF4500');
                        targetCell.appendChild(attackText);
                        
                        setTimeout(() => {
                            if (targetCell.contains(attackText)) {
                                targetCell.removeChild(attackText);
                            }
                            
                            // 计数已完成的目标
                            completedTargets++;
                            
                            // 所有目标都已完成攻击后
                            if (completedTargets >= targets.length) {
                                // 如果有击杀且启用了狩猎之力技能，应用攻击力加成
                                if (killedTargets > 0 && gameState.traps.crossbow.advancedSkills.killBoost) {
                                    unitTypes.crossbow.applyKillBoost(crossbowUnit, attackerIndex, killedTargets);
                                }
                                
                                // 延迟一点时间再解除，确保所有的效果都完成
                                setTimeout(() => {
                                    isSkillExecuting = false;
                                }, 100);
                            }
                        }, 1000);
                        
                        // 应用伤害
                        const damage = crossbowUnit.attack;
                        
                        // 记录目标当前血量，用于判断是否击杀
                        const originalHP = targetData.unit.currentHP;
                        
                        // 为applyDamage函数提供攻击者信息
                        const attacker = {
                            unit: crossbowUnit,
                            index: attackerIndex
                        };
                        
                        applyDamage(targetData, damage, targetCell, attacker);
                        
                        // 检查是否击杀了目标
                        if (originalHP > 0 && targetData.unit.currentHP <= 0) {
                            killedTargets++;
                        }
                    }
                };
                
                // 开始箭矢动画
                requestAnimationFrame(animateArrow);
            } else {
                // 如果目标单元格不存在，增加完成计数
                completedTargets++;
                
                // 检查是否所有目标都已完成
                if (completedTargets >= targets.length) {
                    // 如果有击杀且启用了狩猎之力技能，应用攻击力加成
                    if (killedTargets > 0 && gameState.traps.crossbow.advancedSkills.killBoost) {
                        unitTypes.crossbow.applyKillBoost(crossbowUnit, attackerIndex, killedTargets);
                    }
                    isSkillExecuting = false;
                }
            }
        });
    }, 500);
}

// 存钱罐魔力激发技能：为随机己方单位增加蓝量
function applyManaBoost() {
    // 收集所有己方存活单位（玩家区域24-47）
    const allyUnits = [];
    for (let i = 24; i < 48; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && unit.currentHP > 0 && !unit.isTrap) {
            // 排除机关单位
            allyUnits.push({
                unit: unit,
                index: i
            });
        }
    }
    
    // 如果没有可用单位，直接返回
    if (allyUnits.length === 0) {
        console.log('没有可用的己方单位来应用魔力激发效果');
        return;
    }
    
    // 随机选择一个己方单位
    const randomIndex = Math.floor(Math.random() * allyUnits.length);
    const targetData = allyUnits[randomIndex];
    
    // 增加100蓝量
    const manaBoost = 100;
    targetData.unit.mana = Math.min(300, targetData.unit.mana + manaBoost);
    
    console.log(`存钱罐魔力激发：为位置${targetData.index}的${targetData.unit.type}增加${manaBoost}点蓝量`);
    
    // 显示蓝量增加效果
    const targetCell = document.querySelector(`.grid-cell[data-index="${targetData.index}"]`);
    if (targetCell) {
        const manaText = document.createElement('div');
        manaText.className = 'damage-number';
        manaText.style.color = '#2196F3'; // 蓝色
        manaText.textContent = `+${manaBoost}🔵`;
        targetCell.appendChild(manaText);
        
        setTimeout(() => {
            if (targetCell.contains(manaText)) {
                targetCell.removeChild(manaText);
            }
        }, 1500);
        
        // 更新单位显示
        updateUnitDisplay(targetData.index);
    }
}
