// 生成地牢地图
// Generate dungeon map
function generateDungeonMap() {
    mapContainer.innerHTML = '';
    gameState.dungeon.nodes = [];
    gameState.dungeon.paths = [];
    
    // Hide reserve area when entering dungeon
    // 不再完全隐藏备战区，而是设置display为none，这样在返回单位选择界面时可以重新显示
    document.getElementById('reserve-area').style.display = 'none';
    document.getElementById('enter-dungeon').style.display = 'none';
    
    // 更新资源显示
    oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    updateTeamCount();
    
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;
    
    // Create entrance node
    const entranceNode = {
        id: 'entrance',
        x: containerWidth / 2,
        y: 30,
        type: 'entrance',
        connections: []
    };
    gameState.dungeon.nodes.push(entranceNode);
    
    // Create exit node
    const exitNode = {
        id: 'exit',
        x: containerWidth / 2,
        y: containerHeight - 30,
        type: 'exit',
        connections: []
    };
    
    // Create 3x3 grid of nodes
    const gridWidth = 3;
    const gridHeight = 3;
    const nodeSpacingX = containerWidth / (gridWidth + 1);
    const nodeSpacingY = (containerHeight - 100) / (gridHeight + 1);
    
    // 初始化所有节点为null
    const nodeTypes = Array(9).fill(null);
    
    // 获取当前地牢层数
    const dungeonLevel = gameState.dungeon.level;
    
    // 根据地牢层数调整牢笼事件分布
    // 最后一行（最后三个节点）索引为6, 7, 8
    const lastRowIndices = [6, 7, 8];
    
    // 可用属性列表
    const attributes = ['fire', 'water', 'electric', 'earth', 'grass'];
    
    if (dungeonLevel <= 5) {
        // 前5层：最后一行随机1个精英牢笼，2个普通牢笼
        // 随机选择一个索引放置精英牢笼
        const eliteIndex = lastRowIndices[Math.floor(Math.random() * 3)];
        
        // 在最后一行放置精英和普通牢笼，并为每个牢笼随机分配属性
        lastRowIndices.forEach(index => {
            nodeTypes[index] = {
                type: index === eliteIndex ? 'elite' : 'normal',
                attribute: attributes[Math.floor(Math.random() * attributes.length)]
            };
        });
        
        // 剩余6个节点随机分配（不包含精英牢笼）
        const remainingTypes = [];
        // 添加4个普通牢笼并随机分配属性
        for (let i = 0; i < 4; i++) {
            remainingTypes.push({
                type: 'normal',
                attribute: attributes[Math.floor(Math.random() * attributes.length)]
            });
        }
        // 添加1个补给点
        remainingTypes.push({
            type: 'supply'
        });
        // 添加1个随机事件
        remainingTypes.push({
            type: 'random'
        });
        
        // 打乱顺序
        for (let i = remainingTypes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingTypes[i], remainingTypes[j]] = [remainingTypes[j], remainingTypes[i]];
        }
        
        // 分配给前两行的节点
        let remainingIndex = 0;
        for (let i = 0; i < 6; i++) {
            nodeTypes[i] = remainingTypes[remainingIndex++];
        }
    } else if (dungeonLevel <= 10) {
        // 6-10层：最后一行随机2个精英牢笼，1个普通牢笼
        // 随机选择两个索引放置精英牢笼
        const shuffledLastRow = [...lastRowIndices];
        for (let i = shuffledLastRow.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledLastRow[i], shuffledLastRow[j]] = [shuffledLastRow[j], shuffledLastRow[i]];
        }
        
        // 前两个是精英牢笼，最后一个是普通牢笼
        const eliteIndices = shuffledLastRow.slice(0, 2);
        
        // 在最后一行放置精英和普通牢笼，并为每个牢笼随机分配属性
        lastRowIndices.forEach(index => {
            nodeTypes[index] = {
                type: eliteIndices.includes(index) ? 'elite' : 'normal',
                attribute: attributes[Math.floor(Math.random() * attributes.length)]
            };
        });
        
        // 剩余6个节点随机分配（不包含精英牢笼）
        const remainingTypes = [];
        // 添加4个普通牢笼并随机分配属性
        for (let i = 0; i < 4; i++) {
            remainingTypes.push({
                type: 'normal',
                attribute: attributes[Math.floor(Math.random() * attributes.length)]
            });
        }
        // 添加1个补给点
        remainingTypes.push({
            type: 'supply'
        });
        // 添加1个随机事件
        remainingTypes.push({
            type: 'random'
        });
        
        // 打乱顺序
        for (let i = remainingTypes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingTypes[i], remainingTypes[j]] = [remainingTypes[j], remainingTypes[i]];
        }
        
        // 分配给前两行的节点
        let remainingIndex = 0;
        for (let i = 0; i < 6; i++) {
            nodeTypes[i] = remainingTypes[remainingIndex++];
        }
    } else {
        // 11层及以上：最后一行全部是精英牢笼
        // 在最后一行放置精英牢笼，并为每个牢笼随机分配属性
        lastRowIndices.forEach(index => {
            nodeTypes[index] = {
                type: 'elite',
                attribute: attributes[Math.floor(Math.random() * attributes.length)]
            };
        });
        
        // 剩余6个节点按照4:1:1的比例分配普通牢笼/随机事件/补给点
        const remainingTypes = [];
        // 添加4个普通牢笼并随机分配属性
        for (let i = 0; i < 4; i++) {
            remainingTypes.push({
                type: 'normal',
                attribute: attributes[Math.floor(Math.random() * attributes.length)]
            });
        }
        // 添加1个补给点
        remainingTypes.push({
            type: 'supply'
        });
        // 添加1个随机事件
        remainingTypes.push({
            type: 'random'
        });
        
        // 打乱顺序
        for (let i = remainingTypes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingTypes[i], remainingTypes[j]] = [remainingTypes[j], remainingTypes[i]];
        }
        
        // 分配给前两行的节点
        let remainingIndex = 0;
        for (let i = 0; i < 6; i++) {
            nodeTypes[i] = remainingTypes[remainingIndex++];
        }
    }
    
    // 创建节点
    let nodeIndex = 0;
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const nodeId = `node-${row}-${col}`;
            const nodeX = (col + 1) * nodeSpacingX;
            const nodeY = 70 + (row + 1) * nodeSpacingY;
            
            // 使用已确定的节点信息
            const nodeInfo = nodeTypes[nodeIndex];
            
            const node = {
                id: nodeId,
                x: nodeX,
                y: nodeY,
                row: row,
                col: col,
                type: nodeInfo.type,
                attribute: nodeInfo.attribute,  // 存储属性信息
                connections: []
            };
            
            gameState.dungeon.nodes.push(node);
            nodeIndex++;
        }
    }
    
    // Add exit node last
    gameState.dungeon.nodes.push(exitNode);
    
    // Connect entrance to first row
    const firstRowNodes = gameState.dungeon.nodes.filter(node => node.row === 0 && node.id !== 'entrance' && node.id !== 'exit');
    firstRowNodes.forEach(node => {
        entranceNode.connections.push(node.id);
        createPath(entranceNode, node);
    });
    
    // Connect nodes in the grid - only connect within same column and diagonally down
    for (let row = 0; row < gridHeight - 1; row++) {
        const currentRowNodes = gameState.dungeon.nodes.filter(node => node.row === row && node.id !== 'entrance' && node.id !== 'exit');
        const nextRowNodes = gameState.dungeon.nodes.filter(node => node.row === row + 1 && node.id !== 'entrance' && node.id !== 'exit');
        
        currentRowNodes.forEach(currentNode => {
            // Connect to node directly below (same column)
            const nodeBelow = nextRowNodes.find(node => node.col === currentNode.col);
            if (nodeBelow) {
                currentNode.connections.push(nodeBelow.id);
                createPath(currentNode, nodeBelow);
            }
            
            // 50% chance to connect to bottom left
            if (currentNode.col > 0 && Math.random() < 0.5) {
                const bottomLeft = nextRowNodes.find(node => node.col === currentNode.col - 1);
                if (bottomLeft) {
                    currentNode.connections.push(bottomLeft.id);
                    createPath(currentNode, bottomLeft);
                }
            }
            
            // 50% chance to connect to bottom right
            if (currentNode.col < gridWidth - 1 && Math.random() < 0.5) {
                const bottomRight = nextRowNodes.find(node => node.col === currentNode.col + 1);
                if (bottomRight) {
                    currentNode.connections.push(bottomRight.id);
                    createPath(currentNode, bottomRight);
                }
            }
        });
    }
    
    // Connect last row to exit
    const lastRowNodes = gameState.dungeon.nodes.filter(node => node.row === gridHeight - 1 && node.id !== 'entrance' && node.id !== 'exit');
    lastRowNodes.forEach(node => {
        node.connections.push(exitNode.id);
        createPath(node, exitNode);
    });
    
    // Render nodes
    gameState.dungeon.nodes.forEach(node => {
        createNodeElement(node);
    });
    
    // Set current node to entrance
    gameState.dungeon.currentNode = entranceNode.id;
    updateCurrentNode();
}

// Create a path between two nodes
function createPath(fromNode, toNode) {
    const pathId = `path-${fromNode.id}-${toNode.id}`;
    gameState.dungeon.paths.push({
        id: pathId,
        from: fromNode.id,
        to: toNode.id
    });
    
    const pathElement = document.createElement('div');
    pathElement.className = 'map-path';
    pathElement.id = pathId;
    
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    pathElement.style.width = `${distance}px`;
    pathElement.style.left = `${fromNode.x}px`;
    pathElement.style.top = `${fromNode.y}px`;
    pathElement.style.transform = `rotate(${angle}deg)`;
    
    mapContainer.appendChild(pathElement);
}

// Create a node element
function createNodeElement(node) {
    const nodeElement = document.createElement('div');
    nodeElement.className = `map-node ${node.type}`;
    nodeElement.id = node.id;
    
    // 设置节点位置
    nodeElement.style.left = `${node.x - 25}px`;
    nodeElement.style.top = `${node.y - 25}px`;
    
    // Add event type indicator
    if (node.type !== 'entrance' && node.type !== 'exit') {
        nodeElement.title = node.type.charAt(0).toUpperCase() + node.type.slice(1);
        
        // Add visual indicator based on event type
        if (node.type === 'normal' || node.type === 'elite') {
            // 创建牢笼图标
            const cageEmoji = node.type === 'normal' ? '👹' : '👺';
            nodeElement.innerHTML = cageEmoji;
            
            // 如果有属性信息，添加属性图标
            if (node.attribute) {
                // 属性图标映射
                const attributeIcons = {
                    'fire': '🔥',
                    'water': '💧',
                    'electric': '⚡',
                    'earth': '🌑',
                    'grass': '🌿'
                };
                
                // 创建属性标识元素
                const attributeElement = document.createElement('div');
                attributeElement.className = 'attribute-indicator';
                attributeElement.textContent = attributeIcons[node.attribute] || '❓';
                
                // 将属性添加到节点元素
                nodeElement.appendChild(attributeElement);
                
                // 更新工具提示文本，包括属性信息
                nodeElement.title += ` (${node.attribute})`;
            }
        } else if (node.type === 'supply') {
            nodeElement.innerHTML = '🧪';
        } else if (node.type === 'random') {
            nodeElement.innerHTML = '❓';
        }
    } else if (node.type === 'entrance') {
        nodeElement.innerHTML = '⬇️';
    } else if (node.type === 'exit') {
        nodeElement.innerHTML = '⬆️';
    }
    
    // Add click event for node movement
    nodeElement.addEventListener('click', () => {
        const currentNode = gameState.dungeon.nodes.find(n => n.id === gameState.dungeon.currentNode);
        
        // Check if this node is connected to the current node
        if (currentNode.connections.includes(node.id)) {
            gameState.dungeon.currentNode = node.id;
            updateCurrentNode();
            triggerNodeEvent(node);
        }
    });
    
    mapContainer.appendChild(nodeElement);
}

// Update current node display
function updateCurrentNode() {
    // Remove current class from all nodes
    document.querySelectorAll('.map-node').forEach(node => {
        node.classList.remove('current');
    });
    
    // Add current class to current node
    const currentNodeElement = document.getElementById(gameState.dungeon.currentNode);
    if (currentNodeElement) {
        currentNodeElement.classList.add('current');
    }
}

// Trigger event based on node type
function triggerNodeEvent(node) {
    // Handle different node types
    switch(node.type) {
        case 'normal':
            // Start battle with normal cage and node attribute
            startBattle('normal', node.attribute);
            break;
            
        case 'elite':
            // Start battle with elite cage and node attribute
            startBattle('elite', node.attribute);
            break;
            
        case 'supply':
            // Restore oxygen and reset unit status
            gameState.player.oxygen = Math.min(100, gameState.player.oxygen + 20);
            gameState.units.reserve.forEach(unit => {
                if (unit) {
                    unit.currentHP = unit.maxHP;
                    // Reset any status effects here if implemented
                }
            });
            oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
            alert('补给点：恢复了20点氧气，并且所有单位状态已重置！');
            break;
            
        case 'random':
            // 检查必要的函数是否可用
            if (typeof createUnit !== 'function' || typeof backupUnitInfo !== 'function') {
                console.warn('随机事件需要的函数未定义: ' + 
                             (typeof createUnit !== 'function' ? 'createUnit ' : '') + 
                             (typeof backupUnitInfo !== 'function' ? 'backupUnitInfo' : ''));
            }
            
            // 创建随机事件选择界面
            createRandomEventInterface();
            break;
            
        case 'exit':
            alert('恭喜！你到达了出口！进入地牢商店');
            // 进入地牢商店界面
            showDungeonShop();
            break;
            
        case 'entrance':
            // Nothing happens at entrance
            break;
    }
    
    // Decrease oxygen with each move (except at entrance)
    if (node.type !== 'entrance') {

        oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
        
        // Check if oxygen is depleted
        if (gameState.player.oxygen <= 0) {
            // 检查玩家队伍中是否还有存活的单位
            let hasLivingUnit = false;
            
            // 检查战场上的单位
            for (let i = 24; i < 48; i++) {
                const unit = gameState.units.battleField[i];
                if (unit && unit.currentHP > 0 && !unit.isTrap) {
                    hasLivingUnit = true;
                    break;
                }
            }
            
            // 检查备战区的单位
            if (!hasLivingUnit) {
                for (let i = 0; i < gameState.units.reserve.length; i++) {
                    const unit = gameState.units.reserve[i];
                    if (unit && unit.currentHP > 0) {
                        hasLivingUnit = true;
                        break;
                    }
                }
            }
            
            // 只有当氧气耗尽且没有存活单位时，才判定游戏结束
            if (!hasLivingUnit) {
                // 处理地牢探索结束奖励
                processDungeonRewards(false);
                
                // 重置备战区显示并返回主界面
                document.getElementById('reserve-area').style.display = 'flex';
                showScreen('home');
            } else {
                // 仍有单位存活，只提示氧气耗尽
                alert('你的氧气耗尽了！请尽快完成当前探索或寻找补给点！');
            }
        }
    }
}

// 激活属性交换效果
function activateAttributeExchange(elementType, decreaseParam, increaseParam) {
    // 获取参数的具体描述
    const decreaseDesc = getParamDescription(decreaseParam, 'decrease');
    const increaseDesc = getParamDescription(increaseParam, 'increase');
    
    // 查找玩家队伍中指定属性的单位
    let affectedUnits = 0;
    
    // 检查战场上的单位
    for (let i = 24; i < 48; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && unit.element === elementType && !unit.isTrap) {
            // 应用参数变化
            applyParamChange(unit, decreaseParam, 'decrease');
            applyParamChange(unit, increaseParam, 'increase');
            
            // 更新单位显示
            if (typeof updateUnitDisplay === 'function') {
                updateUnitDisplay(i);
            }
            
            affectedUnits++;
        }
    }
    
    // 检查备战区的单位
    for (let i = 0; i < gameState.units.reserve.length; i++) {
        const unit = gameState.units.reserve[i];
        if (unit && unit.element === elementType) {
            // 应用参数变化
            applyParamChange(unit, decreaseParam, 'decrease');
            applyParamChange(unit, increaseParam, 'increase');
            
            affectedUnits++;
        }
    }
}

// 获取参数描述
function getParamDescription(param, type) {
    switch (param) {
        case 'maxHP':
            return type === 'decrease' ? '最大血量(-10%)' : '最大血量(+10%)';
        case 'attack':
            return type === 'decrease' ? '攻击力(-10%)' : '攻击力(+10%)';
        case 'manaRegen':
            return type === 'decrease' ? '回蓝量(-5)' : '回蓝量(+5)';
        case 'speed':
            return type === 'decrease' ? '速度(-1)' : '速度(+1)';
        default:
            return param;
    }
}

// 应用参数变化
function applyParamChange(unit, param, type) {
    if (type === 'decrease') {
        switch (param) {
            case 'maxHP':
                // 保持当前血量与最大血量的比例
                const ratio = unit.currentHP / unit.maxHP;
                unit.maxHP = Math.max(1, Math.floor(unit.maxHP * 0.9));
                unit.currentHP = Math.max(1, Math.floor(unit.maxHP * ratio));
                break;
            case 'attack':
                unit.attack = Math.max(1, Math.floor(unit.attack * 0.9));
                break;
            case 'manaRegen':
                unit.manaRegen = Math.max(1, unit.manaRegen - 5);
                console.log(unit.manaRegen);
                break;
            case 'speed':
                unit.speed = Math.max(1, unit.speed - 1);
                console.log(unit.speed);
                break;
        }
    } else if (type === 'increase') {
        switch (param) {
            case 'maxHP':
                // 保持当前血量与最大血量的比例
                const ratio = unit.currentHP / unit.maxHP;
                unit.maxHP = Math.floor(unit.maxHP * 1.1);
                unit.currentHP = Math.floor(unit.maxHP * ratio);
                break;
            case 'attack':
                unit.attack = Math.floor(unit.attack * 1.1);
                break;
            case 'manaRegen':
                unit.manaRegen = unit.manaRegen + 5;
                console.log(unit.manaRegen);
                break;
            case 'speed':
                unit.speed = unit.speed + 1;
                console.log(unit.speed);
                break;
        }
    }
    
    // 如果单位有类型，更新单位类型的基础属性
    if (unit.type && unitTypes[unit.type]) {
        // 只有当单位等级为1时才更新基础属性
        if (unit.level === 1) {
            // 根据参数类型更新对应的基础属性
            switch (param) {
                case 'maxHP':
                    unitTypes[unit.type].hp = unit.maxHP;
                    break;
                case 'attack':
                    unitTypes[unit.type].attack = unit.attack;
                    break;
                case 'manaRegen':
                    unitTypes[unit.type].manaRegen = unit.manaRegen;
                    break;
                case 'speed':
                    unitTypes[unit.type].speed = unit.speed;
                    break;
            }
            
            // 自动保存游戏
            if (typeof saveSystem !== 'undefined') {
                saveSystem.saveGame();
            }
        }
    }
}

// 获取元素属性名称
function getElementName(elementType) {
    const elementNames = {
        'fire': '火',
        'water': '水',
        'electric': '电',
        'earth': '土',
        'grass': '草'
    };
    return elementNames[elementType] || elementType;
}

// 创建属性交换事件
function createAttributeExchangeEvent() {
    // 获取玩家队伍中存在的元素属性
    const existingElements = getExistingElements();
    
    // 如果没有单位，返回null
    if (existingElements.length === 0) {
        return null;
    }
    
    // 随机选择一种元素属性
    const randomElement = existingElements[Math.floor(Math.random() * existingElements.length)];
    
    // 可选参数
    const params = ['maxHP', 'attack', 'manaRegen', 'speed'];
    
    // 随机选择两个不同的参数
    const decreaseIndex = Math.floor(Math.random() * params.length);
    let increaseIndex;
    do {
        increaseIndex = Math.floor(Math.random() * params.length);
    } while (increaseIndex === decreaseIndex);
    
    const decreaseParam = params[decreaseIndex];
    const increaseParam = params[increaseIndex];
    
    // 创建事件对象
    return {
        id: `attributeExchange_${randomElement}_${decreaseParam}_${increaseParam}`,
        name: `${getElementName(randomElement)}属性交换`,
        description: `${getElementName(randomElement)}属性单位的${getParamDescription(decreaseParam, 'decrease')}，${getParamDescription(increaseParam, 'increase')}`,
        action: () => activateAttributeExchange(randomElement, decreaseParam, increaseParam),
        inPool: 1
    };
}

// 获取玩家队伍中存在的元素属性
function getExistingElements() {
    const elements = new Set();
    
    // 检查战场上的单位
    for (let i = 24; i < 48; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && unit.element && !unit.isTrap) {
            elements.add(unit.element);
        }
    }
    
    // 检查备战区的单位
    for (let i = 0; i < gameState.units.reserve.length; i++) {
        const unit = gameState.units.reserve[i];
        if (unit && unit.element) {
            elements.add(unit.element);
        }
    }
    
    return Array.from(elements);
}

// 修改createRandomEventInterface函数，添加属性交换事件
function createRandomEventInterface() {
    // 创建事件层
    const eventOverlay = document.createElement('div');
    eventOverlay.id = 'random-event-overlay';
    
    // 创建事件卡片
    const eventCard = document.createElement('div');
    eventCard.className = 'event-card';

    // 添加标题
    const title = document.createElement('h2');
    title.textContent = '随机事件';
    title.className = 'event-title';
    eventCard.appendChild(title);

    // 如果事件池未初始化，则初始化
    if (!gameState.eventPool) {
        gameState.eventPool = [
            {
                id: 'upgradeUnit',
                name: '单位升级',
                description: '花费1贝壳，随机升级1名我方非3级单位',
                action: upgradeRandomUnit,
                inPool: 1 // 1表示在池中，0表示不在池中
            },
            {
                id: 'healUnits',
                name: '全体治疗',
                description: '花费1贝壳，恢复我方所有单位血量',
                action: healAllUnits,
                inPool: 1
            },
            {
                id: 'getRandomUnit',
                name: '招募单位',
                description: '花费1贝壳，随机获得1名单位，但血量只有50%',
                action: getRandomUnit,
                inPool: 1
            },
            {
                id: 'attributeExchange',
                name: '属性交换',
                description: '随机选择一种元素属性的单位，降低一项属性并提升另一项',
                // 没有固定的action，将在事件选择时动态创建
                isDynamic: true, // 标记为动态事件
                inPool: 0
            },
            {
                id: 'jobBalance',
                name: '职业平衡',
                description: '随机选择一种职业的单位，降低一项属性并提升另一项',
                // 没有固定的action，将在事件选择时动态创建
                isDynamic: true, // 标记为动态事件
                inPool: 0   
            },
            {
                id: 'unitTraining',
                name: '单位特训',
                description: '随机选择一名单位，提升其某项属性',
                // 没有固定的action，将在事件选择时动态创建
                isDynamic: true, // 标记为动态事件
                inPool: 1
            },
            {
                id: 'oxygenBoost',
                name: '氧气增幅',
                description: '每次战斗胜利，立即获得氧气瓶容量的10%',
                action: activateOxygenBoost,
                oneTime: true,
                inPool: 0
            },
            {
                id: 'oxygenEmergency',
                name: '氧气应急',
                description: '当氧气瓶首次低于0时，立即获得50%初始容量',
                action: activateOxygenEmergency,
                oneTime: true,
                inPool: 0
            },
            {
                id: 'oxygenConversion',
                name: '氧气转换',
                description: '溢出氧气值按照1：1转换为贝壳数',
                action: activateOxygenConversion,
                oneTime: true,
                inPool: 0
            },
            {
                id: 'oxygenBuff',
                name: '氧气强化',
                description: '氧气值容量大于90%时，战斗开始时为所有己方单位增加各自初始攻击力的10%',
                action: activateOxygenBuff,
                oneTime: true,
                inPool: 0
            },
            {
                id: 'oxygenHealingEfficiency',
                name: '氧气治疗效率',
                description: '氧气值容量小于90%时，单位恢复时氧气消耗减半',
                action: activateOxygenHealingEfficiency,
                oneTime: true,
                inPool: 0
            },
            {
                id: 'goldAttackBuff',
                name: '金币强化',
                description: '每拥有100贝壳，战斗开始时为所有己方单位增加各自初始攻击力的10%',
                action: activateGoldAttackBuff,
                oneTime: true,
                inPool: 0
            },
            {
                id: 'shopBonus',
                name: '商店红利',
                description: '每次进入商店，立即获得当前贝壳数的20%',
                action: activateShopBonus,
                oneTime: true,
                inPool: 0
            }
        ];
    }

    // 从事件池中选择3个随机事件
    const availableEvents = gameState.eventPool.filter(event => event.inPool === 1 && !event.selected);
    const selectedEvents = [];
    
    // 如果可用事件不足3个，则使用所有可用事件
    const eventCount = Math.min(3, availableEvents.length);
    
    // 随机选择事件
    for (let i = 0; i < eventCount; i++) {
        if (availableEvents.length === 0) break;
        const randomIndex = Math.floor(Math.random() * availableEvents.length);
        let event = availableEvents[randomIndex];
        
        // 如果是属性交换事件，则动态生成具体的交换内容
        if (event.id === 'attributeExchange') {
            const exchangeEvent = createAttributeExchangeEvent();
            if (exchangeEvent) {
                // 使用动态生成的事件
                event = exchangeEvent;
            } else {
                // 如果无法创建属性交换事件（没有可用的元素属性单位），则跳过
                availableEvents.splice(randomIndex, 1);
                i--; // 重试这个位置
                continue;
            }
        }
        // 如果是职业平衡事件，则动态生成具体的平衡内容
        else if (event.id === 'jobBalance') {
            const balanceEvent = createJobBalanceEvent();
            if (balanceEvent) {
                // 使用动态生成的事件
                event = balanceEvent;
            } else {
                // 如果无法创建职业平衡事件（没有可用的职业单位），则跳过
                availableEvents.splice(randomIndex, 1);
                i--; // 重试这个位置
                continue;
            }
        }
        // 如果是单位特训事件，则动态生成具体的特训内容
        else if (event.id === 'unitTraining') {
            const trainingEvent = createUnitTrainingEvent();
            if (trainingEvent) {
                // 使用动态生成的事件
                event = trainingEvent;
            } else {
                // 如果无法创建单位特训事件（没有可用的单位），则跳过
                availableEvents.splice(randomIndex, 1);
                i--; // 重试这个位置
                continue;
            }
        }
        
        selectedEvents.push(event);
        availableEvents.splice(randomIndex, 1);
    }

    // 创建事件选项
    selectedEvents.forEach(event => {
        const option = document.createElement('div');
        option.className = 'event-option';

        // 事件名称和描述
        option.innerHTML = `<strong class="event-option-name">${event.name}</strong>: ${event.description}`;

        // 点击事件
        option.addEventListener('click', () => {
            // 执行事件动作
            if (event.action) {
                event.action();
            }
            
            // 如果是一次性事件，标记为已选择
            if (event.oneTime) {
                event.selected = true;
                
                // 从事件池中移除一次性事件
                gameState.eventPool = gameState.eventPool.filter(e => e.id !== event.id);
            }
            
            // 确保单位信息被正确保存
            if (typeof backupUnitInfo === 'function') {
                console.log('事件处理完成，备份单位信息');
                backupUnitInfo();
            }
            
            // 移除事件界面
            document.body.removeChild(eventOverlay);
        });

        eventCard.appendChild(option);
    });

    // 添加"直接离开"选项
    const leaveOption = document.createElement('div');
    leaveOption.className = 'leave-option';
    leaveOption.textContent = '直接离开';
    leaveOption.addEventListener('click', () => {
        // 确保单位信息被正确保存
        if (typeof backupUnitInfo === 'function') {
            console.log('直接离开，备份单位信息');
            backupUnitInfo();
        }
        
        // 移除事件界面
        document.body.removeChild(eventOverlay);
    });

    eventCard.appendChild(leaveOption);
    eventOverlay.appendChild(eventCard);
    document.body.appendChild(eventOverlay);
}

// 随机升级一名非3级单位
function upgradeRandomUnit() {
    // 检查贝壳数量
    if (gameState.player.shells < 1) {
        alert('贝壳不足，无法升级单位！');
        return;
    }

    // 收集所有非3级单位
    const upgradableUnits = [];
    
    // 检查战场上的单位
    for (let i = 24; i < 48; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && unit.level < 3 && !unit.isTrap) {
            upgradableUnits.push({unit, location: 'battlefield', index: i});
        }
    }
    
    // 检查备战区的单位
    for (let i = 0; i < gameState.units.reserve.length; i++) {
        const unit = gameState.units.reserve[i];
        if (unit && unit.level < 3) {
            upgradableUnits.push({unit, location: 'reserve', index: i});
        }
    }

    // 如果没有可升级的单位
    if (upgradableUnits.length === 0) {
        alert('没有可升级的单位！');
        return;
    }

    // 扣除贝壳
    gameState.player.shells -= 1;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;

    // 随机选择一个单位升级
    const randomIndex = Math.floor(Math.random() * upgradableUnits.length);
    const selectedUnit = upgradableUnits[randomIndex];
    
    // 保存原始单位属性
    const oldLevel = selectedUnit.unit.level;
    const oldMaxHP = selectedUnit.unit.maxHP;
    const oldAttack = selectedUnit.unit.attack;
    const oldSpeed = selectedUnit.unit.speed;
    const oldManaRegen = selectedUnit.unit.manaRegen;
    
    // 升级单位等级
    selectedUnit.unit.level += 1;
    
    // 计算新的属性值，血量和攻击力翻倍，速度和回蓝保持不变
    selectedUnit.unit.maxHP = oldMaxHP * 2;
    selectedUnit.unit.currentHP = selectedUnit.unit.maxHP; // 升级时恢复满血
    selectedUnit.unit.attack = oldAttack * 2;
    
    // 速度和回蓝不变
    selectedUnit.unit.speed = oldSpeed;
    selectedUnit.unit.manaRegen = oldManaRegen;
    
    // 初始化单位可能需要的特殊属性或技能
    const baseStats = unitTypes[selectedUnit.unit.type];
    
    // 初始化被动技能
    
    // 显示升级信息
    alert(`升级成功！${baseStats.name || selectedUnit.unit.type}升级到${selectedUnit.unit.level}级`);
    
    // 更新显示
    if (selectedUnit.location === 'battlefield') {
        updateUnitDisplay(selectedUnit.index);
    } else {
        initBattleReserveArea(); // 更新备战区显示
    }
}

// 恢复所有单位血量
function healAllUnits() {
    // 检查贝壳数量
    if (gameState.player.shells < 1) {
        alert('贝壳不足，无法治疗单位！');
        return;
    }
    
    // 扣除贝壳
    gameState.player.shells -= 1;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    // 恢复战场上的单位
    let healedCount = 0;
    for (let i = 24; i < 48; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && unit.currentHP < unit.maxHP && !unit.isTrap) {
            unit.currentHP = unit.maxHP;
            updateUnitDisplay(i);
            healedCount++;
        }
    }
    
    // 恢复备战区的单位
    for (let i = 0; i < gameState.units.reserve.length; i++) {
        const unit = gameState.units.reserve[i];
        if (unit && unit.currentHP < unit.maxHP) {
            unit.currentHP = unit.maxHP;
            healedCount++;
        }
    }
    
    // 更新备战区显示
    initBattleReserveArea();
    
    // 显示治疗信息
    alert(`治疗成功！恢复了${healedCount}个单位的生命值`);
}

// 获取随机单位
function getRandomUnit() {
    // 检查贝壳数量
    if (gameState.player.shells < 1) {
        alert('贝壳不足，无法获得单位！');
        return;
    }
    
    // 检查必要的函数是否存在
    if (typeof createUnit !== 'function') {
        console.error('createUnit 函数未定义，无法创建单位');
        alert('系统错误：无法创建单位');
        return;
    }
    
    if (typeof updateUnitDisplay !== 'function') {
        console.error('updateUnitDisplay 函数未定义，可能无法正确显示单位');
    }
    
    if (typeof initBattleReserveArea !== 'function') {
        console.error('initBattleReserveArea 函数未定义，可能无法正确显示备战区');
    }
    
    // 扣除贝壳
    gameState.player.shells -= 1;
    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    
    try {
        // 只选择inPool值为1的单位类型
        const types = Object.keys(unitTypes).filter(type => unitTypes[type].inPool === 1);
        
        // 随机选择一个单位类型
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        // 创建随机等级的单位(1-2级)
        const randomLevel = Math.floor(Math.random() * 2) + 1;
        const newUnit = createUnit(randomType, randomLevel);
        console.log(`创建了新单位: ${randomType}, 等级: ${randomLevel}`);
        
        // 设置单位血量为50%
        newUnit.currentHP = Math.round(newUnit.maxHP * 0.5);
        
        // 尝试放入备战区
        let placed = false;
        for (let i = 0; i < gameState.units.reserve.length; i++) {
            if (gameState.units.reserve[i] === null) {
                gameState.units.reserve[i] = newUnit;
                console.log(`单位放入备战区位置: ${i}`);
                placed = true;
                break;
            }
        }
        
        // 如果备战区已满，尝试放入战场
        if (!placed) {
            for (let i = 24; i < 48; i++) {
                if (gameState.units.battleField[i] === null) {
                    gameState.units.battleField[i] = newUnit;
                    console.log(`单位放入战场位置: ${i}`);
                    updateUnitDisplay(i);
                    placed = true;
                    break;
                }
            }
        }
        
        // 如果无法放置
        if (!placed) {
            alert(`无法获得新单位，没有空位！返还1贝壳`);
            gameState.player.shells += 1;
            shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
            return;
        }
        
        // 更新备战区显示
        initBattleReserveArea();
        
        // 显示获得单位信息
        const unitName = unitTypes[randomType].name || randomType;
        alert(`获得了${randomLevel}级${unitName}！血量为50%`);
        
        // 备份单位信息，确保单位状态被保存
        if (typeof backupUnitInfo === 'function') {
            console.log('备份单位信息');
            backupUnitInfo();
        } else {
            console.warn('backupUnitInfo 函数未定义，无法备份单位状态');
        }
        
        // 自动保存游戏
        if (typeof saveSystem !== 'undefined') {
            saveSystem.saveGame();
        }
    } catch (error) {
        console.error('获取随机单位时出错:', error);
        alert('获取单位失败，返还1贝壳');
        gameState.player.shells += 1;
        shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
    }
}

// 激活氧气增幅效果
function activateOxygenBoost() {
    // 添加氧气增幅效果到游戏状态
    if (!gameState.effects) {
        gameState.effects = {};
    }
    gameState.effects.oxygenBoostOnVictory = true;
    
    alert('已激活氧气增幅效果！每次战斗胜利后，将获得氧气瓶容量的10%');
}

// 激活氧气应急效果
function activateOxygenEmergency() {
    // 添加氧气应急效果到游戏状态
    if (!gameState.effects) {
        gameState.effects = {};
    }
    gameState.effects.oxygenEmergency = true;
    
    alert('已激活氧气应急效果！当氧气首次低于0时，将立即获得50%初始容量');
    
    // 添加检查氧气的事件监听
    if (!gameState.oxygenEmergencyListener) {
        gameState.oxygenEmergencyListener = true;
        
        // 修改 triggerNodeEvent 函数中的氧气检查部分
        const originalTriggerNodeEvent = window.triggerNodeEvent;
        if (originalTriggerNodeEvent) {
            window.triggerNodeEvent = function(node) {
                // 调用原始函数
                originalTriggerNodeEvent(node);
                
                // 检查氧气是否低于0且应急效果已激活但未使用
                if (gameState.player.oxygen <= 0 && 
                    gameState.effects && gameState.effects.oxygenEmergency && 
                    !gameState.effects.oxygenEmergencyUsed) {
                    
                    // 激活应急氧气
                    const emergencyOxygen = 50; // 50%初始容量
                    gameState.player.oxygen = emergencyOxygen;
                    oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
                    
                    // 标记为已使用
                    gameState.effects.oxygenEmergencyUsed = true;
                    
                    // 显示氧气应急效果
                    const emergencyIndicator = document.createElement('div');
                    emergencyIndicator.className = 'effect-indicator oxygen-emergency-indicator';
                    emergencyIndicator.textContent = `氧气应急效果触发！获得${emergencyOxygen}点氧气`;
                    document.body.appendChild(emergencyIndicator);
                    
                    setTimeout(() => {
                        if (document.body.contains(emergencyIndicator)) {
                            document.body.removeChild(emergencyIndicator);
                        }
                    }, 2000);
                }
            };
        }
    }
}

// 激活氧气转换效果
function activateOxygenConversion() {
    // 添加氧气转换效果到游戏状态
    if (!gameState.effects) {
        gameState.effects = {};
    }
    gameState.effects.oxygenConversion = true;
    
    alert('已激活氧气转换效果！溢出氧气值将按照1:1转换为贝壳数');
    
    // 修改所有可能增加氧气的函数
    // 1. 修改补给点逻辑
    const originalTriggerNodeEvent = window.triggerNodeEvent;
    if (originalTriggerNodeEvent) {
        window.triggerNodeEvent = function(node) {
            // 记录修改前的氧气值
            const beforeOxygen = gameState.player.oxygen;
            
            // 调用原始函数
            originalTriggerNodeEvent(node);
            
            // 检查氧气是否增加且转换效果已激活
            if (node.type === 'supply' && 
                gameState.effects && gameState.effects.oxygenConversion) {
                
                const afterOxygen = gameState.player.oxygen;
                const oxygenGained = afterOxygen - beforeOxygen;
                
                // 如果氧气增加且超过最大值
                if (oxygenGained > 0 && afterOxygen > 100) {
                    // 计算溢出量
                    const overflow = afterOxygen - 100;
                    
                    // 转换为贝壳
                    gameState.player.shells += overflow;
                    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
                    
                    // 将氧气设置为最大值
                    gameState.player.oxygen = 100;
                    oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
                    
                    // 显示转换效果
                    const conversionIndicator = document.createElement('div');
                    conversionIndicator.className = 'effect-indicator oxygen-conversion-indicator';
                    conversionIndicator.textContent = `氧气转换效果触发！${overflow}点溢出氧气转换为${overflow}个贝壳`;
                    document.body.appendChild(conversionIndicator);
                    
                    setTimeout(() => {
                        if (document.body.contains(conversionIndicator)) {
                            document.body.removeChild(conversionIndicator);
                        }
                    }, 2000);
                }
            }
        };
    }
    
    // 2. 修改战斗胜利氧气增幅逻辑
    const originalEndBattle = window.endBattle;
    if (originalEndBattle) {
        window.endBattle = function() {
            // 记录修改前的氧气值
            const beforeOxygen = gameState.player.oxygen;
            
            // 调用原始函数
            originalEndBattle();
            
            // 检查氧气是否增加且转换效果已激活
            if (gameState.effects && gameState.effects.oxygenConversion) {
                const afterOxygen = gameState.player.oxygen;
                
                // 如果氧气超过最大值
                if (afterOxygen > 100) {
                    // 计算溢出量
                    const overflow = afterOxygen - 100;
                    
                    // 转换为贝壳
                    gameState.player.shells += overflow;
                    shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
                    
                    // 将氧气设置为最大值
                    gameState.player.oxygen = 100;
                    oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
                    
                    // 显示转换效果
                    const conversionIndicator = document.createElement('div');
                    conversionIndicator.className = 'effect-indicator oxygen-conversion-indicator';
                    conversionIndicator.textContent = `氧气转换效果触发！${overflow}点溢出氧气转换为${overflow}个贝壳`;
                    document.body.appendChild(conversionIndicator);
                    
                    setTimeout(() => {
                        if (document.body.contains(conversionIndicator)) {
                            document.body.removeChild(conversionIndicator);
                        }
                    }, 2000);
                }
            }
        };
    }
}

// 激活氧气强化效果
function activateOxygenBuff() {
    // 添加氧气强化效果到游戏状态
    if (!gameState.effects) {
        gameState.effects = {};
    }
    gameState.effects.oxygenBuff = true;
    
    alert('已激活氧气强化效果！氧气值容量大于90%时，战斗开始时为所有己方单位增加各自初始攻击力的10%');
    
    // 修改开始战斗的函数
    const originalStartBattleAction = window.startBattleAction;
    if (originalStartBattleAction) {
        window.startBattleAction = function() {
            // 检查氧气是否大于90%且强化效果已激活
            if (gameState.player.oxygen > 90 && 
                gameState.effects && gameState.effects.oxygenBuff) {
                
                // 为所有己方单位增加攻击力
                let buffedUnits = 0;
                
                for (let i = 24; i < 48; i++) {
                    const unit = gameState.units.battleField[i];
                    if (unit && !unit.isTrap && unit.currentHP > 0) {
                        // 记录原始攻击力（考虑金币增幅效果可能已经应用）
                        let baseAttack;
                        if (unit.originalAttackForGoldBuff) {
                            // 如果已经应用了金币增幅，使用金币增幅前的原始攻击力
                            baseAttack = unit.originalAttackForGoldBuff;
                        } else {
                            // 否则使用当前攻击力
                            baseAttack = unit.attack;
                        }
                        
                        // 保存氧气增幅前的攻击力
                        if (!unit.originalAttackForOxygenBuff) {
                            unit.originalAttackForOxygenBuff = baseAttack;
                        }
                        
                        // 计算氧气增幅的攻击力加成
                        const oxygenAttackBonus = Math.round(unit.originalAttackForOxygenBuff * 0.1);
                        
                        // 应用氧气增幅
                        if (unit.originalAttackForGoldBuff) {
                            // 如果已经应用了金币增幅，需要考虑金币增幅的效果
                            const goldAttackBonus = Math.round(unit.originalAttackForGoldBuff * 0.1 * Math.floor(gameState.player.shells / 100));
                            unit.attack = unit.originalAttackForOxygenBuff + oxygenAttackBonus + goldAttackBonus;
                        } else {
                            // 否则只应用氧气增幅
                            unit.attack = unit.originalAttackForOxygenBuff + oxygenAttackBonus;
                        }
                        
                        // 更新显示
                        updateUnitDisplay(i);
                        buffedUnits++;
                    }
                }
                
                if (buffedUnits > 0) {
                    // 显示氧气强化效果
                    const oxygenBuffIndicator = document.createElement('div');
                    oxygenBuffIndicator.className = 'effect-indicator oxygen-buff-indicator';
                    oxygenBuffIndicator.textContent = `氧气强化效果触发！${buffedUnits}个单位获得10%攻击力加成`;
                    document.body.appendChild(oxygenBuffIndicator);
                    
                    setTimeout(() => {
                        if (document.body.contains(oxygenBuffIndicator)) {
                            document.body.removeChild(oxygenBuffIndicator);
                        }
                    }, 2000);
                }
            }
            
            // 调用原始函数
            originalStartBattleAction();
        };
    }
    
    // 修改结束战斗的函数，重置攻击力
    const originalEndBattle = window.endBattle;
    if (originalEndBattle) {
        window.endBattle = function() {
            // 重置所有单位的攻击力
            for (let i = 24; i < 48; i++) {
                const unit = gameState.units.battleField[i];
                if (unit) {
                    // 如果应用了氧气增幅，恢复原始攻击力
                    if (unit.originalAttackForOxygenBuff) {
                        // 如果同时应用了金币增幅，保留金币增幅的原始值
                        if (unit.originalAttackForGoldBuff) {
                            unit.originalAttackForGoldBuff = unit.originalAttackForOxygenBuff;
                        } else {
                            unit.attack = unit.originalAttackForOxygenBuff;
                        }
                        delete unit.originalAttackForOxygenBuff;
                    }
                    
                    // 更新显示
                    if (typeof updateUnitDisplay === 'function') {
                        updateUnitDisplay(i);
                    }
                }
            }
            
            // 调用原始函数
            originalEndBattle();
        };
    }
}

// 激活氧气治疗效率效果
function activateOxygenHealingEfficiency() {
    // 添加氧气治疗效率效果到游戏状态
    if (!gameState.effects) {
        gameState.effects = {};
    }
    gameState.effects.oxygenHealingEfficiency = true;
    
    alert('已激活氧气治疗效率效果！氧气值容量小于90%时，单位恢复时氧气消耗减半');
    
    // 修改单位回复函数
    const originalHealUnits = window.healUnits;
    if (originalHealUnits) {
        window.healUnits = function() {
            // 检查是否满足条件：氧气值小于90%且效果已激活
            if (gameState.player.oxygen < 90 && 
                gameState.effects && gameState.effects.oxygenHealingEfficiency) {
                
                let continueHealing = true;
                
                while (continueHealing) {
                    if (gameState.player.oxygen < 0.5) { // 需要至少0.5点氧气
                        alert('氧气不足，无法回复单位！');
                        break;
                    }
                    
                    const injuredUnits = [];
                    for (let i = 24; i < 48; i++) {
                        const unit = gameState.units.battleField[i];
                        if (unit && unit.currentHP < unit.maxHP) {
                            injuredUnits.push({
                                unit: unit,
                                index: i
                            });
                        }
                    }
                    
                    const injuredCount = injuredUnits.length;
                    if (injuredCount === 0) {
                        alert('所有单位已满血！');
                        break;
                    }
                    
                    const oxygenAvailable = gameState.player.oxygen * 2; // 效率翻倍
                    let oxygenUsed = 0;
                    let healingApplied = 0;
                    
                    if (oxygenAvailable < injuredCount) {
                        for (let i = 0; i < Math.floor(oxygenAvailable); i++) {
                            injuredUnits[i].unit.currentHP += 1;
                            healingApplied += 1;
                        }
                        oxygenUsed = healingApplied / 2; // 消耗减半
                    } else {
                        for (let i = 0; i < injuredCount; i++) {
                            injuredUnits[i].unit.currentHP += 1;
                        }
                        oxygenUsed = injuredCount / 2; // 消耗减半
                    }
                    
                    // 扣除氧气值
                    gameState.player.oxygen -= oxygenUsed;
                    oxygenDisplay.textContent = `氧气: ${gameState.player.oxygen}`;
                    
                    // 显示效率提升效果
                    const healEfficiencyIndicator = document.createElement('div');
                    healEfficiencyIndicator.className = 'effect-indicator heal-efficiency-indicator';
                    healEfficiencyIndicator.textContent = `治疗效率提升！消耗${oxygenUsed}氧气，恢复${healingApplied}生命`;
                    document.body.appendChild(healEfficiencyIndicator);
                    
                    setTimeout(() => {
                        document.body.removeChild(healEfficiencyIndicator);
                    }, 1500);
                    
                    // 更新单位显示
                    updateBattlefieldDisplay();
                }
            } else {
                // 如果条件不满足，使用原始函数
                originalHealUnits();
            }
        };
    }
}

// 激活金币攻击增幅效果
function activateGoldAttackBuff() {
    // 添加金币攻击增幅效果到游戏状态
    if (!gameState.effects) {
        gameState.effects = {};
    }
    gameState.effects.goldAttackBuff = true;
    
    alert('已激活金币攻击增幅效果！每拥有100贝壳，战斗开始时为所有己方单位增加各自初始攻击力的10%');
    
    // 修改开始战斗的函数
    const originalStartBattleAction = window.startBattleAction;
    if (originalStartBattleAction) {
        window.startBattleAction = function() {
            // 检查是否激活了金币攻击增幅效果
            if (gameState.effects && gameState.effects.goldAttackBuff) {
                // 计算贝壳数量对应的增幅倍数
                const shellCount = gameState.player.shells;
                const buffMultiplier = Math.floor(shellCount / 100);
                
                if (buffMultiplier > 0) {
                    // 为所有己方单位增加攻击力
                    let buffedUnits = 0;
                    
                    for (let i = 24; i < 48; i++) {
                        const unit = gameState.units.battleField[i];
                        if (unit && !unit.isTrap && unit.currentHP > 0) {
                            // 记录原始攻击力（考虑氧气增幅效果可能已经应用）
                            let baseAttack;
                            if (unit.originalAttackForOxygenBuff) {
                                // 如果已经应用了氧气增幅，使用氧气增幅前的原始攻击力
                                baseAttack = unit.originalAttackForOxygenBuff;
                            } else {
                                // 否则使用当前攻击力
                                baseAttack = unit.attack;
                            }
                            
                            // 保存金币增幅前的攻击力
                            if (!unit.originalAttackForGoldBuff) {
                                unit.originalAttackForGoldBuff = baseAttack;
                            }
                            
                            // 计算金币增幅的攻击力加成
                            const goldAttackBonus = Math.round(unit.originalAttackForGoldBuff * 0.1 * buffMultiplier);
                            
                            // 应用金币增幅
                            if (unit.originalAttackForOxygenBuff) {
                                // 如果已经应用了氧气增幅，需要考虑氧气增幅的效果
                                const oxygenAttackBonus = Math.round(unit.originalAttackForOxygenBuff * 0.1);
                                unit.attack = unit.originalAttackForOxygenBuff + oxygenAttackBonus + goldAttackBonus;
                            } else {
                                // 否则只应用金币增幅
                                unit.attack = unit.originalAttackForGoldBuff + goldAttackBonus;
                            }
                            
                            // 更新显示
                            updateUnitDisplay(i);
                            buffedUnits++;
                        }
                    }
                    
                    if (buffedUnits > 0) {
                        // 显示金币强化效果
                        const goldBuffIndicator = document.createElement('div');
                        goldBuffIndicator.className = 'effect-indicator gold-buff-indicator';
                        goldBuffIndicator.textContent = `金币强化效果触发！拥有${shellCount}贝壳，${buffedUnits}个单位获得${buffMultiplier * 10}%攻击力加成`;
                        document.body.appendChild(goldBuffIndicator);
                        
                        setTimeout(() => {
                            if (document.body.contains(goldBuffIndicator)) {
                                document.body.removeChild(goldBuffIndicator);
                            }
                        }, 2000);
                    }
                }
            }
            
            // 调用原始函数
            originalStartBattleAction();
        };
    }
    
    // 修改结束战斗的函数，重置攻击力
    const originalEndBattle = window.endBattle;
    if (originalEndBattle) {
        window.endBattle = function() {
            // 重置所有单位的攻击力
            for (let i = 24; i < 48; i++) {
                const unit = gameState.units.battleField[i];
                if (unit) {
                    // 如果应用了金币增幅，恢复原始攻击力
                    if (unit.originalAttackForGoldBuff) {
                        // 如果同时应用了氧气增幅，保留氧气增幅的原始值
                        if (unit.originalAttackForOxygenBuff) {
                            unit.originalAttackForOxygenBuff = unit.originalAttackForGoldBuff;
                        } else {
                            unit.attack = unit.originalAttackForGoldBuff;
                        }
                        delete unit.originalAttackForGoldBuff;
                    }
                    
                    // 更新显示
                    if (typeof updateUnitDisplay === 'function') {
                        updateUnitDisplay(i);
                    }
                }
            }
            
            // 调用原始函数
            originalEndBattle();
        };
    }
}

// 激活商店红利效果
function activateShopBonus() {
    // 添加商店红利效果到游戏状态
    if (!gameState.effects) {
        gameState.effects = {};
    }
    gameState.effects.shopBonus = true;
    
    // 初始化上次进入商店的时间戳
    gameState.effects.lastShopEntry = 0;
    
    alert('已激活商店红利效果！每次进入商店，立即获得当前贝壳数的20%');
    
    // 绑定商店红利效果
    bindShopBonusEffect();
}

// 绑定商店红利效果到showScreen函数
function bindShopBonusEffect() {
    // 查找showScreen函数
    if (typeof window.showScreen === 'function') {
        // 检查是否已经绑定过
        if (!window.originalShowScreen) {
            window.originalShowScreen = window.showScreen;
        }
        
        window.showScreen = function(screenName) {
            // 调用原始函数
            window.originalShowScreen(screenName);
            
            // 检查是否进入商店且商店红利效果已激活
            if (screenName === 'dungeon-shop' && 
                gameState.effects && gameState.effects.shopBonus) {
                
                // 获取当前时间戳
                const currentTime = Date.now();
                
                // 检查是否是新的商店访问（至少间隔5秒）
                if (!gameState.effects.lastShopEntry || 
                    currentTime - gameState.effects.lastShopEntry > 5000) {
                    
                    // 更新上次进入商店的时间戳
                    gameState.effects.lastShopEntry = currentTime;
                    
                    // 计算商店红利
                    const currentShells = gameState.player.shells;
                    const bonusShells = Math.floor(currentShells * 0.2);
                    
                    if (bonusShells > 0) {
                        // 增加贝壳
                        gameState.player.shells += bonusShells;
                        
                        // 更新贝壳显示
                        if (shellDisplay) {
                            shellDisplay.textContent = `贝壳: ${gameState.player.shells}`;
                        }
                        
                        // 显示效果
                        const bonusIndicator = document.createElement('div');
                        bonusIndicator.style.position = 'fixed';
                        bonusIndicator.style.top = '50%';
                        bonusIndicator.style.left = '50%';
                        bonusIndicator.style.transform = 'translate(-50%, -50%)';
                        bonusIndicator.style.backgroundColor = 'rgba(255, 215, 0, 0.7)'; // 金色
                        bonusIndicator.style.color = 'white';
                        bonusIndicator.style.padding = '10px';
                        bonusIndicator.style.borderRadius = '5px';
                        bonusIndicator.style.zIndex = '1000';
                        bonusIndicator.textContent = `商店红利触发！获得${bonusShells}贝壳(${currentShells} × 20%)`;
                        document.body.appendChild(bonusIndicator);
                        
                        setTimeout(() => {
                            if (document.body.contains(bonusIndicator)) {
                                document.body.removeChild(bonusIndicator);
                            }
                        }, 2000);
                    }
                }
            }
        };
    }
}

// 在地图生成后检查并重新绑定效果
const originalGenerateDungeonMap = window.generateDungeonMap;
if (originalGenerateDungeonMap) {
    window.generateDungeonMap = function() {
        // 调用原始函数
        originalGenerateDungeonMap();
        
        // 检查并重新绑定效果
        if (gameState.effects) {
            // 重新绑定商店红利效果
            if (gameState.effects.shopBonus) {
                bindShopBonusEffect();
            }
        }
    };
}

// 调试函数：设置事件的inPool属性
window.setEventInPool = function(eventId, inPoolValue) {
    if (!gameState.eventPool) {
        console.error('事件池未初始化');
        return false;
    }
    
    const event = gameState.eventPool.find(e => e.id === eventId);
    if (!event) {
        console.error(`未找到ID为${eventId}的事件`);
        return false;
    }
    
    event.inPool = inPoolValue ? 1 : 0;
    console.log(`已将事件"${event.name}"(${eventId})的inPool属性设置为${inPoolValue ? 1 : 0}`);
    return true;
};

// 调试函数：列出所有事件及其inPool状态
window.listEvents = function() {
    if (!gameState.eventPool) {
        console.error('事件池未初始化');
        return;
    }
    
    console.log('事件池中的所有事件：');
    gameState.eventPool.forEach(event => {
        const status = event.inPool === 1 ? '启用' : '禁用';
        const selectedStatus = event.selected ? '已选择' : '未选择';
        console.log(`- ${event.name}(${event.id}): ${status}, ${selectedStatus}`);
    });
};

// 调试函数：重置所有事件的selected状态
window.resetEventSelection = function() {
    if (!gameState.eventPool) {
        console.error('事件池未初始化');
        return;
    }
    
    gameState.eventPool.forEach(event => {
        event.selected = false;
    });
    
    console.log('已重置所有事件的选择状态');
};

// 调试函数：只启用指定事件，禁用其他所有事件
window.enableOnlyEvent = function(eventId) {
    if (!gameState.eventPool) {
        console.error('事件池未初始化');
        return false;
    }
    
    let found = false;
    
    gameState.eventPool.forEach(event => {
        if (event.id === eventId) {
            event.inPool = 1;
            found = true;
            console.log(`已启用事件"${event.name}"`);
        } else {
            event.inPool = 0;
        }
    });
    
    if (!found) {
        console.error(`未找到ID为${eventId}的事件`);
        return false;
    }
    
    console.log('其他所有事件已禁用');
    return true;
};

// 激活职业平衡效果
function activateJobBalance(jobType, decreaseParam, increaseParam) {
    // 获取参数的具体描述
    const decreaseDesc = getParamDescription(decreaseParam, 'decrease');
    const increaseDesc = getParamDescription(increaseParam, 'increase');
    
    // 获取职业名称
    const jobName = getJobName(jobType);
    
    // 查找玩家队伍中指定职业的单位
    let affectedUnits = 0;
    
    // 检查战场上的单位
    for (let i = 24; i < 48; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && unit.job === jobType && !unit.isTrap) {
            // 应用参数变化
            applyParamChange(unit, decreaseParam, 'decrease');
            applyParamChange(unit, increaseParam, 'increase');
            
            // 更新单位显示
            if (typeof updateUnitDisplay === 'function') {
                updateUnitDisplay(i);
            }
            
            affectedUnits++;
        }
    }
    
    // 检查备战区的单位
    for (let i = 0; i < gameState.units.reserve.length; i++) {
        const unit = gameState.units.reserve[i];
        if (unit && unit.job === jobType) {
            // 应用参数变化
            applyParamChange(unit, decreaseParam, 'decrease');
            applyParamChange(unit, increaseParam, 'increase');
            
            affectedUnits++;
        }
    }
}

// 获取职业名称
function getJobName(jobType) {
    const jobNames = {
        'warrior': '战士',
        'ranged': '远程',
        'assassin': '刺客',
        'support': '辅助',
        'mage': '法师'
    };
    return jobNames[jobType] || jobType;
}

// 创建职业平衡事件
function createJobBalanceEvent() {
    // 获取玩家队伍中存在的职业
    const existingJobs = getExistingJobs();
    
    // 如果没有单位，返回null
    if (existingJobs.length === 0) {
        return null;
    }
    
    // 随机选择一种职业
    const randomJob = existingJobs[Math.floor(Math.random() * existingJobs.length)];
    
    // 可选参数
    const params = ['maxHP', 'attack', 'manaRegen', 'speed'];
    
    // 随机选择两个不同的参数
    const decreaseIndex = Math.floor(Math.random() * params.length);
    let increaseIndex;
    do {
        increaseIndex = Math.floor(Math.random() * params.length);
    } while (increaseIndex === decreaseIndex);
    
    const decreaseParam = params[decreaseIndex];
    const increaseParam = params[increaseIndex];
    
    // 创建事件对象
    return {
        id: `jobBalance_${randomJob}_${decreaseParam}_${increaseParam}`,
        name: `${getJobName(randomJob)}职业平衡`,
        description: `${getJobName(randomJob)}职业单位的${getParamDescription(decreaseParam, 'decrease')}，${getParamDescription(increaseParam, 'increase')}`,
        action: () => activateJobBalance(randomJob, decreaseParam, increaseParam),
        inPool: 1
    };
}

// 获取玩家队伍中存在的职业
function getExistingJobs() {
    const existingJobs = new Set();
    
    // 检查战场上的单位
    for (let i = 24; i < 48; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && !unit.isTrap) {
            existingJobs.add(unit.job);
        }
    }
    
    // 检查备战区的单位
    for (let i = 0; i < gameState.units.reserve.length; i++) {
        const unit = gameState.units.reserve[i];
        if (unit) {
            existingJobs.add(unit.job);
        }
    }
    
    return Array.from(existingJobs);
}

// 激活单位特训效果
function activateUnitTraining(unitIndex, param) {
    // 获取选中的单位
    let unit = null;
    let unitLocation = '';
    
    // 检查战场上的单位
    if (unitIndex >= 24 && unitIndex < 48) {
        unit = gameState.units.battleField[unitIndex];
        unitLocation = '战场';
    }
    // 检查备战区的单位
    else if (unitIndex >= 0 && unitIndex < 6) {
        unit = gameState.units.reserve[unitIndex];
        unitLocation = '备战区';
    }
    
    if (!unit) {
        alert('未找到指定单位！');
        return;
    }
    
    // 获取单位名称
    const unitName = unitTypes[unit.type].name || unit.type;
    
    // 应用属性提升
    let paramDesc = '';
    let originalValue = 0;
    let newValue = 0;
    
    switch (param) {
        case 'maxHP':
            originalValue = unit.maxHP;
            unit.maxHP = Math.round(unit.maxHP * 1.2); // 增加20%最大血量
            unit.currentHP = unit.maxHP; // 同时恢复满血
            newValue = unit.maxHP;
            paramDesc = '最大生命值';
            break;
        case 'attack':
            originalValue = unit.attack;
            unit.attack = Math.round(unit.attack * 1.2); // 增加20%攻击力
            newValue = unit.attack;
            paramDesc = '攻击力';
            break;
        case 'manaRegen':
            originalValue = unit.manaRegen;
            unit.manaRegen += 10; // 增加10点回蓝速度
            newValue = unit.manaRegen;
            paramDesc = '回蓝速度';
            break;
        case 'speed':
            originalValue = unit.speed;
            unit.speed += 2; // 增加2点速度
            newValue = unit.speed;
            paramDesc = '速度';
            break;
    }
    
    // 更新单位显示
    if (unitLocation === '战场') {
        if (typeof updateUnitDisplay === 'function') {
            updateUnitDisplay(unitIndex);
        }
    } else if (unitLocation === '备战区') {
        if (typeof initBattleReserveArea === 'function') {
            initBattleReserveArea();
        }
    }
    
    // 显示提示信息
    alert(`单位特训完成！${unitLocation}的${unitName}的${paramDesc}从${originalValue}提升到了${newValue}！`);
}

// 创建单位特训事件
function createUnitTrainingEvent() {
    // 获取玩家队伍中的所有单位
    const playerUnits = [];
    
    // 检查战场上的单位
    for (let i = 24; i < 48; i++) {
        const unit = gameState.units.battleField[i];
        if (unit && !unit.isTrap) {
            playerUnits.push({
                unit: unit,
                index: i
            });
        }
    }
    
    // 检查备战区的单位
    for (let i = 0; i < gameState.units.reserve.length; i++) {
        const unit = gameState.units.reserve[i];
        if (unit) {
            playerUnits.push({
                unit: unit,
                index: i
            });
        }
    }
    
    // 如果没有单位，返回null
    if (playerUnits.length === 0) {
        return null;
    }
    
    // 随机选择一个单位
    const randomUnitIndex = Math.floor(Math.random() * playerUnits.length);
    const selectedUnit = playerUnits[randomUnitIndex];
    
    // 获取单位名称
    const unitName = unitTypes[selectedUnit.unit.type].name || selectedUnit.unit.type;
    
    // 随机选择一个要提升的参数
    const params = ['maxHP', 'attack', 'manaRegen', 'speed'];
    const randomParamIndex = Math.floor(Math.random() * params.length);
    const selectedParam = params[randomParamIndex];
    
    // 获取参数描述
    let paramDesc = '';
    let bonusDesc = '';
    
    switch (selectedParam) {
        case 'maxHP':
            paramDesc = '最大生命值';
            bonusDesc = '+20%';
            break;
        case 'attack':
            paramDesc = '攻击力';
            bonusDesc = '+20%';
            break;
        case 'manaRegen':
            paramDesc = '回蓝速度';
            bonusDesc = '+10';
            break;
        case 'speed':
            paramDesc = '速度';
            bonusDesc = '+2';
            break;
    }
    
    // 创建事件
    return {
        id: 'unitTraining_' + selectedUnit.index + '_' + selectedParam,
        name: '单位特训：' + unitName,
        description: `对${unitName}进行特训，提升其${paramDesc}${bonusDesc}`,
        action: () => activateUnitTraining(selectedUnit.index, selectedParam),
        inPool: 1
    };
}

// 处理地牢探索结束奖励
function processDungeonRewards(isRetreat) {
    // 获取当前地牢层数
    const dungeonLevel = gameState.dungeon.level;
    
    // 计算奖励金币
    const goldReward = dungeonLevel * 10;
    
    // 更新玩家金币
    const currentGold = gameState.player.gold;
    gameState.player.gold += goldReward;
    
    // 显示奖励信息
    let message = '';
    if (isRetreat) {
        message = `你选择撤退！\n\n探索奖励：\n到达地牢第${dungeonLevel}层\n获得金币：${goldReward}`;
    } else {
        message = `探索结束！\n\n探索奖励：\n到达地牢第${dungeonLevel}层\n获得金币：${goldReward}`;
    }
    
    alert(message);
    
    // 更新资源显示
    if (window.updateResourceDisplay && typeof updateResourceDisplay === 'function') {
        updateResourceDisplay();
    } else if (window.goldDisplay) {
        goldDisplay.textContent = gameState.player.gold;
    }
    
    // 自动保存游戏
    if (typeof saveSystem !== 'undefined') {
        saveSystem.saveGame();
    }
    
    // 重置地牢层数
    gameState.dungeon.level = 1;
}