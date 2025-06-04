// 寻找攻击目标
// 根据职业类型选择不同的目标选择策略
function findNearestTarget(attackerIndex, isEnemy) {
    const attackerUnit = gameState.units.battleField[attackerIndex];
    const baseStats = unitTypes[attackerUnit.type];
    const job = baseStats.job;
    
    // 根据职业选择不同的目标选择策略
    switch(job) {
        case 'assassin': // 刺客优先攻击远程单位
            return findFarthestTarget(attackerIndex, isEnemy);
        case 'support': // 辅助优先攻击最近的敌人
            applyPassiveSupportBuff(attackerIndex, isEnemy);
            return findDefaultTarget(attackerIndex, isEnemy);
        default: // 战士/远程/法师使用默认目标选择
            return findDefaultTarget(attackerIndex, isEnemy);
    }
}

// 辅助的被动技能
function applyPassiveSupportBuff(attackerIndex, isEnemy) {
    const attackerCol = attackerIndex % 6;
    const attackerRow = Math.floor(attackerIndex / 6);
    
    // 遍历所有友方单位
    for (let i = 0; i < battleUnits.length; i++) {
        const allyData = battleUnits[i];
        
        // 跳过敌方单位、死亡单位和自己
        if (allyData.isEnemy !== isEnemy || allyData.unit.currentHP <= 0 || allyData.index === attackerIndex) continue;
        
        const allyCol = allyData.index % 6;
        const allyRow = Math.floor(allyData.index / 6);
        
        // 计算距离
        const distance = Math.abs(allyCol - attackerCol) + Math.abs(allyRow - attackerRow);
        
        // 只对相邻的单位（距离为1）应用增益
        if (distance <= 1) {
            // 应用增益效果
            const buffAmount = Math.round(allyData.unit.attack * 0.1);
            allyData.unit.attack += buffAmount;
            
            // 显示增益效果
            const allyCell = document.querySelector(`.grid-cell[data-index="${allyData.index}"]`);
            if (allyCell) {
                const buffIndicator = document.createElement('div');
                buffIndicator.className = 'damage-number';
                buffIndicator.style.color = '#4CAF50'; // 绿色
                buffIndicator.textContent = `+${buffAmount}⚔️`;
                allyCell.appendChild(buffIndicator);
                
                setTimeout(() => {
                    if (allyCell.contains(buffIndicator)) {
                        allyCell.removeChild(buffIndicator);
                    }
                }, 1000);
                
                updateUnitDisplay(allyData.index);
            }
        }
    }
}

// 从目标列表中找到最近目标
function findClosestFromTargets(attackerIndex, targets) {
    const attackerCol = attackerIndex % 6;
    const attackerRow = Math.floor(attackerIndex / 6);
    let closestTarget = null;
    let minDistance = Infinity;
    
    for (let i = 0; i < targets.length; i++) {
        const targetData = targets[i];
        const targetCol = targetData.index % 6;
        const targetRow = Math.floor(targetData.index / 6);
        
        // 计算距离
        let distance;
        if (targetCol === attackerCol) {
            distance = Math.abs(targetRow - attackerRow);
        } else {
            distance = Math.abs(targetRow - attackerRow) + Math.abs(targetCol - attackerCol);
        }
        
        if (distance < minDistance) {
            minDistance = distance;
            closestTarget = targetData;
        }
    }
    
    return closestTarget;
}

// 默认目标选择 - 寻找最近的敌人
function findDefaultTarget(attackerIndex, isEnemy) {
    const attackerCol = attackerIndex % 6;
    const attackerRow = Math.floor(attackerIndex / 6);
    let closestTarget = null;
    
    // 检查同一列是否有敌人
    let sameColumnTargets = [];
    for (let i = 0; i < battleUnits.length; i++) {
        const targetData = battleUnits[i];
        
        // 跳过同阵营单位和已死亡单位
        if (targetData.isEnemy === isEnemy || targetData.unit.currentHP <= 0) continue;
        
        // 跳过隐身单位
        if (targetData.unit.statusEffects && targetData.unit.statusEffects.invisible) continue;
        
        const targetCol = targetData.index % 6;
        
        // 收集同一列敌人
        if (targetCol === attackerCol) {
            sameColumnTargets.push(targetData);
        }
    }
    
    // 如果同一列有敌人，找出最近的
    if (sameColumnTargets.length > 0) {
        let minDistance = Infinity;
        for (let i = 0; i < sameColumnTargets.length; i++) {
            const targetData = sameColumnTargets[i];
            const targetRow = Math.floor(targetData.index / 6);
            const distance = Math.abs(targetRow - attackerRow);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestTarget = targetData;
            }
        }
        return closestTarget;
    }
    
    // 如果同一列没有敌人，按照列的距离从近到远查找
    const maxColDistance = 5; // 最大列距离（6列，从0到5）
    for (let colDist = 1; colDist <= maxColDistance; colDist++) {
        // 检查左侧列
        const leftCol = attackerCol - colDist;
        // 检查右侧列
        const rightCol = attackerCol + colDist;
        
        let targetsInAdjacentCols = [];
        
        // 收集相邻列的敌人
        for (let i = 0; i < battleUnits.length; i++) {
            const targetData = battleUnits[i];
            
            // 跳过同阵营单位和已死亡单位
            if (targetData.isEnemy === isEnemy || targetData.unit.currentHP <= 0) continue;
            
            const targetCol = targetData.index % 6;
            
            // 收集当前检查的相邻列的敌人
            if (targetCol === leftCol || targetCol === rightCol) {
                targetsInAdjacentCols.push(targetData);
            }
        }
        
        // 如果相邻列有敌人，找出最近的
        if (targetsInAdjacentCols.length > 0) {
            let minDistance = Infinity;
            for (let i = 0; i < targetsInAdjacentCols.length; i++) {
                const targetData = targetsInAdjacentCols[i];
                const targetRow = Math.floor(targetData.index / 6);
                const distance = Math.abs(targetRow - attackerRow);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTarget = targetData;
                }
            }
            return closestTarget;
        }
    }    
    return closestTarget;
}

// 寻找最远的敌人（刺客的目标选择）
function findFarthestTarget(attackerIndex, isEnemy) {
    const attackerCol = attackerIndex % 6;
    const attackerRow = Math.floor(attackerIndex / 6);
    let farthestTarget = null;
    
    // 首先检查同一列是否有敌人
    let sameColumnTargets = [];
    for (let i = 0; i < battleUnits.length; i++) {
        const targetData = battleUnits[i];
        
        // 跳过同阵营单位和已死亡单位
        if (targetData.isEnemy === isEnemy || targetData.unit.currentHP <= 0) continue;
        
        // 跳过隐身状态单位
        if (targetData.unit.statusEffects && targetData.unit.statusEffects.invisible) continue;
        
        const targetCol = targetData.index % 6;
        
        // 收集同一列的敌人
        if (targetCol === attackerCol) {
            sameColumnTargets.push(targetData);
        }
    }
    
    // 如果同一列有敌人，找出最远的
    if (sameColumnTargets.length > 0) {
        let maxDistance = -1;
        for (let i = 0; i < sameColumnTargets.length; i++) {
            const targetData = sameColumnTargets[i];
            const targetRow = Math.floor(targetData.index / 6);
            const distance = Math.abs(targetRow - attackerRow);
            
            if (distance > maxDistance) {
                maxDistance = distance;
                farthestTarget = targetData;
            }
        }
        return farthestTarget;
    }
    
    // 如果同一列没有敌人，按照列的距离从近到远查找
    const maxColDistance = 5; // 最大列距离（6列，从0到5）
    for (let colDist = 1; colDist <= maxColDistance; colDist++) {
        // 检查左侧列
        const leftCol = attackerCol - colDist;
        // 检查右侧列
        const rightCol = attackerCol + colDist;
        
        let targetsInAdjacentCols = [];
        
        // 收集相邻列的敌人
        for (let i = 0; i < battleUnits.length; i++) {
            const targetData = battleUnits[i];
            
            // 跳过同阵营单位和已死亡单位
            if (targetData.isEnemy === isEnemy || targetData.unit.currentHP <= 0) continue;
            
            const targetCol = targetData.index % 6;
            
            // 收集当前检查的相邻列的敌人
            if (targetCol === leftCol || targetCol === rightCol) {
                targetsInAdjacentCols.push(targetData);
            }
        }
        
        // 如果相邻列有敌人，找出最远的
        if (targetsInAdjacentCols.length > 0) {
            let maxDistance = -1;
            for (let i = 0; i < targetsInAdjacentCols.length; i++) {
                const targetData = targetsInAdjacentCols[i];
                const targetRow = Math.floor(targetData.index / 6);
                const distance = Math.abs(targetRow - attackerRow);
                
                if (distance > maxDistance) {
                    maxDistance = distance;
                    farthestTarget = targetData;
                }
            }
            return farthestTarget;
        }
    }
    
    return farthestTarget;
}

// 寻找最近的友方单位（辅助职业的目标选择）
function findNearestAlly(attackerIndex, isEnemy) {
    const attackerCol = attackerIndex % 6;
    const attackerRow = Math.floor(attackerIndex / 6);
    let closestAlly = null;
    let minDistance = Infinity;
    
    // 遍历所有单位寻找友方目标
    for (let i = 0; i < battleUnits.length; i++) {
        const targetData = battleUnits[i];
        
        // 跳过敌方单位、自己和已死亡单位
        if (targetData.isEnemy !== isEnemy || targetData.index === attackerIndex || targetData.unit.currentHP <= 0) continue;
        
        const targetCol = targetData.index % 6;
        const targetRow = Math.floor(targetData.index / 6);
        
        // 计算曼哈顿距离
        const distance = Math.abs(targetRow - attackerRow) + Math.abs(targetCol - attackerCol);
        
        // 更新最近友方目标
        if (distance < minDistance) {
            minDistance = distance;
            closestAlly = targetData;
        }
    }
    
    return closestAlly;
}