// 保存和加载游戏数据的功能
const saveSystem = {
    // 保存游戏数据到本地存储
    saveGame: function() {
        try {
            // 保存玩家个人信息
            const playerData = {
                level: gameState.player.level,
                exp: gameState.player.exp,
                gold: gameState.player.gold,
                summonStones: gameState.player.summonStones,
                tickets: gameState.player.tickets,
                oxygen: gameState.player.oxygen,
                shells: gameState.player.shells
            };
            
            // 保存单位伙伴信息
            const unitsData = {};
            
            // 遍历所有单位类型
            for (const unitType in unitTypes) {
                if (unitTypes.hasOwnProperty(unitType)) {
                    // 只保存基本属性和inPool参数
                    unitsData[unitType] = {
                        hp: unitTypes[unitType].hp,
                        attack: unitTypes[unitType].attack,
                        speed: unitTypes[unitType].speed,
                        manaRegen: unitTypes[unitType].manaRegen,
                        inPool: unitTypes[unitType].inPool
                    };
                }
            }
            
            // 组合所有要保存的数据
            const saveData = {
                player: playerData,
                units: unitsData,
                saveDate: new Date().toISOString()
            };
            
            // 将数据转换为JSON字符串并保存到本地存储
            localStorage.setItem('shelterGameSave', JSON.stringify(saveData));
            
            console.log('游戏已保存');
            return true;
        } catch (error) {
            console.error('保存游戏失败:', error);
            return false;
        }
    },
    
    // 从本地存储加载游戏数据
    loadGame: function() {
        try {
            // 从本地存储获取保存的数据
            const savedData = localStorage.getItem('shelterGameSave');
            
            if (!savedData) {
                console.log('没有找到保存的游戏数据');
                return false;
            }
            
            // 将JSON字符串转换回对象
            const saveData = JSON.parse(savedData);
            
            // 恢复玩家个人信息
            if (saveData.player) {
                gameState.player.level = saveData.player.level;
                gameState.player.exp = saveData.player.exp;
                gameState.player.gold = saveData.player.gold;
                gameState.player.summonStones = saveData.player.summonStones;
                gameState.player.tickets = saveData.player.tickets;
                gameState.player.oxygen = saveData.player.oxygen;
                gameState.player.shells = saveData.player.shells;
                
                // 更新显示
                if (window.updateResourceDisplay && typeof updateResourceDisplay === 'function') {
                    // 使用统一的资源更新函数
                    updateResourceDisplay();
                } else {
                    // 兼容旧代码，直接更新各个显示元素
                    if (window.levelDisplay) levelDisplay.textContent = `Lv.${gameState.player.level}`;
                    if (window.expDisplay && document.getElementById('exp-fill')) {
                        const expPercentage = gameState.player.exp / (gameState.player.level * 100) * 100;
                        document.getElementById('exp-fill').style.width = `${Math.min(100, expPercentage)}%`;
                    }
                    if (window.goldDisplay) goldDisplay.textContent = gameState.player.gold;
                    if (window.summonStonesDisplay) summonStonesDisplay.textContent = gameState.player.summonStones;
                    if (window.ticketsDisplay) ticketsDisplay.textContent = gameState.player.tickets;
                    if (window.oxygenDisplay) oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
                    if (window.shellDisplay) shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
                }
            }
            
            // 恢复单位伙伴信息
            if (saveData.units) {
                for (const unitType in saveData.units) {
                    if (unitTypes.hasOwnProperty(unitType)) {
                        // 恢复单位的基本属性和inPool参数
                        unitTypes[unitType].hp = saveData.units[unitType].hp;
                        unitTypes[unitType].attack = saveData.units[unitType].attack;
                        unitTypes[unitType].speed = saveData.units[unitType].speed;
                        unitTypes[unitType].manaRegen = saveData.units[unitType].manaRegen;
                        unitTypes[unitType].inPool = saveData.units[unitType].inPool;
                    }
                }
            }
            
            console.log('游戏已加载');
            return true;
        } catch (error) {
            console.error('加载游戏失败:', error);
            return false;
        }
    },
    
    // 检查是否有保存的游戏
    hasSavedGame: function() {
        return localStorage.getItem('shelterGameSave') !== null;
    },
    
    // 获取保存的游戏信息
    getSaveInfo: function() {
        const savedData = localStorage.getItem('shelterGameSave');
        if (!savedData) return null;
        
        try {
            const saveData = JSON.parse(savedData);
            return {
                playerLevel: saveData.player.level,
                saveDate: new Date(saveData.saveDate).toLocaleString()
            };
        } catch (error) {
            console.error('获取保存信息失败:', error);
            return null;
        }
    },
    
    // 删除保存的游戏
    deleteSave: function() {
        try {
            localStorage.removeItem('shelterGameSave');
            console.log('游戏存档已删除');
            return true;
        } catch (error) {
            console.error('删除游戏存档失败:', error);
            return false;
        }
    },
    
    // 更新玩家资源并自动保存
    updatePlayerResource: function(resourceType, value) {
        if (!gameState || !gameState.player) return false;
        
        // 更新玩家资源
        switch (resourceType) {
            case 'level':
                gameState.player.level = value;
                break;
            case 'exp':
                gameState.player.exp = value;
                break;
            case 'gold':
                gameState.player.gold = value;
                break;
            case 'summonStones':
                gameState.player.summonStones = value;
                break;
            case 'tickets':
                gameState.player.tickets = value;
                break;
            case 'oxygen':
                gameState.player.oxygen = value;
                if (window.oxygenDisplay) oxygenDisplay.textContent = `氧气: ${value}`;
                break;
            case 'shells':
                gameState.player.shells = value;
                if (window.shellDisplay) shellDisplay.textContent = `贝壳: ${value}`;
                break;
            default:
                return false;
        }
        
        // 更新主界面资源显示
        if (window.updateResourceDisplay && typeof updateResourceDisplay === 'function') {
            updateResourceDisplay();
        }
        
        // 自动保存游戏
        this.saveGame();
        return true;
    }
}; 