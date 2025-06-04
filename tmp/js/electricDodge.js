// 电属性共鸣闪避功能

/**
 * 判断单位是否可以闪避攻击或负面效果
 * @param {Object} target - 目标单位数据
 * @param {string} effectType - 效果类型，可以是'damage'或'debuff'
 * @returns {boolean} - 是否成功闪避
 */
function canDodge(target, effectType = 'damage') {
    // 检查目标是否存在且是电属性单位
    if (!target || !target.unit || !target.unit.element) return false;
    
    // 检查是否是电属性单位
    const isElectricUnit = target.unit.element === 'electric';
    
    // 检查是否激活了电属性共鸣
    const isPlayerElectricResonanceActive = gameState.synergy?.player?.electricResonanceActive && !target.isEnemy;
    const isEnemyElectricResonanceActive = gameState.synergy?.enemy?.electricResonanceActive && target.isEnemy;
    
    // 如果是电属性单位且激活了对应阵营的电属性共鸣
    if (isElectricUnit && (isPlayerElectricResonanceActive || isEnemyElectricResonanceActive)) {
        // 20%概率闪避
        const dodgeChance = 0.99;
        const isDodged = Math.random() < dodgeChance;
        
        // 如果闪避成功，显示闪避效果
        if (isDodged) {
            const targetCell = document.querySelector(`.grid-cell[data-index="${target.index}"]`);
            if (targetCell) {
                const dodgeText = document.createElement('div');
                dodgeText.className = 'damage-number';
                dodgeText.style.color = '#66BB6A'; // 绿色
                
                // 根据效果类型显示不同的闪避文本
                if (effectType === 'debuff') {
                    dodgeText.textContent = '闪避效果!';
                } else {
                    dodgeText.textContent = '闪避!';
                }
                
                targetCell.appendChild(dodgeText);
                
                setTimeout(() => {
                    if (targetCell.contains(dodgeText)) {
                        targetCell.removeChild(dodgeText);
                    }
                }, 1000);
            }
        }
        
        return isDodged;
    }
    
    return false;
}