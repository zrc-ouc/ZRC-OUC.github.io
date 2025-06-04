// 导航到不同的界面
// DOM elements
const battleModesScreen = document.getElementById('battle-modes');
const unitSelectionScreen = document.getElementById('unit-selection');
const dungeonMapScreen = document.getElementById('dungeon-map');
const availableUnitsContainer = document.getElementById('available-units');
const reserveArea = document.getElementById('reserve-area');
const enterDungeonButton = document.getElementById('enter-dungeon');
const mapContainer = document.getElementById('map-container');
const oxygenDisplay = document.getElementById('oxygen-display');
const shellDisplay = document.getElementById('shell-display');
const teamCountDisplay = document.getElementById('team-count');
const pauseButton = document.getElementById('pause-button');
const pauseMenu = document.getElementById('pause-menu');
const mainResources = document.querySelector('.main-resources');
const dungeonResources = document.querySelector('.dungeon-resources');

// 暂停菜单按钮
const teamButton = document.getElementById('team-button');
const statsButton = document.getElementById('stats-button');
const retreatButton = document.getElementById('retreat-button');
const resumeButton = document.getElementById('resume-button');

// 暂停菜单功能
pauseButton.addEventListener('click', () => {
    pauseMenu.classList.remove('hidden');
});

resumeButton.addEventListener('click', () => {
    pauseMenu.classList.add('hidden');
});

teamButton.addEventListener('click', () => {
    // 显示队伍管理界面
    alert('队伍管理功能即将推出');
    pauseMenu.classList.add('hidden');
});

statsButton.addEventListener('click', () => {
    // 显示统计信息
    alert('统计信息功能即将推出');
    pauseMenu.classList.add('hidden');
});

retreatButton.addEventListener('click', () => {
    // 确认撤退
    if (confirm('确定要撤退吗？当前探索进度将会丢失！')) {
        // 处理地牢探索结束奖励
        if (typeof processDungeonRewards === 'function') {
            processDungeonRewards(true);
        }
        exitDungeon();
    }
});

// 退出地牢，返回主界面
function exitDungeon() {
    document.body.classList.remove('dungeon-mode');
    // 关闭暂停菜单
    pauseMenu.classList.add('hidden');
    showScreen('home');
}

// Navigation buttons
const navButtons = document.querySelectorAll('.nav-button');
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Handle navigation
        if (button.id === 'nav-battle') {
            showScreen('home');
        }
        // Other navigation buttons will be implemented later
    });
});

// Battle mode selection
document.getElementById('endless-dungeon').addEventListener('click', () => {
    showScreen('unit-selection');
    generateRandomUnits();
    document.body.classList.add('dungeon-mode');
    
    // 确保备战区显示
    reserveArea.style.display = 'flex';
});

// Enter dungeon button
enterDungeonButton.addEventListener('click', () => {
    // Check if at least one unit is selected
    if (gameState.units.reserve.some(unit => unit !== null)) {
        showScreen('dungeon-map');
        generateDungeonMap();
        updateTeamCount();
    } else {
        alert('Please select at least one unit!');
    }
});

// 更新队伍数量显示
function updateTeamCount() {
    const unitCount = gameState.units.reserve.filter(unit => unit !== null).length;
    teamCountDisplay.textContent = `队伍: ${unitCount}/6`;
}

// Function to show a specific screen
function showScreen(screenName) {
    battleModesScreen.style.display = 'none';
    unitSelectionScreen.style.display = 'none';
    dungeonMapScreen.style.display = 'none';
    document.getElementById('battle-screen').style.display = 'none';
    document.getElementById('dungeon-shop').style.display = 'none';
    document.getElementById('partners-screen').style.display = 'none';
    document.getElementById('tavern-screen').style.display = 'none';
    
    // 重置资源显示
    mainResources.style.display = 'flex';
    dungeonResources.style.display = 'none';
    pauseButton.style.display = 'none';
    
    // 默认隐藏清空存档按钮
    const resetSaveContainer = document.getElementById('reset-save-container');
    if (resetSaveContainer) {
        resetSaveContainer.style.display = 'none';
    }
    
    // Show bottom navigation bar by default
    document.getElementById('bottom-bar').style.display = 'flex';
    
    gameState.currentScreen = screenName;
    
    // 检查是否在地牢模式
    const isDungeonMode = document.body.classList.contains('dungeon-mode');
    
    switch(screenName) {
        case 'home':
            battleModesScreen.style.display = 'flex';
            document.body.classList.remove('dungeon-mode');
            // 只在主界面显示清空存档按钮
            if (resetSaveContainer) {
                resetSaveContainer.style.display = 'block';
                // 确保按钮可见
                resetSaveContainer.style.visibility = 'visible';
                resetSaveContainer.style.opacity = '1';
            }
            break;
        case 'unit-selection':
            unitSelectionScreen.style.display = 'flex';
            // 确保备战区显示
            reserveArea.style.display = 'flex';
            if (isDungeonMode) {
                // 在地牢模式下调整显示
                mainResources.style.display = 'none';
                dungeonResources.style.display = 'flex';
                pauseButton.style.display = 'flex';
                document.getElementById('bottom-bar').style.display = 'none';
            }
            break;
        case 'dungeon-map':
            dungeonMapScreen.style.display = 'block';
            // 在地牢模式下调整显示
            mainResources.style.display = 'none';
            dungeonResources.style.display = 'flex';
            pauseButton.style.display = 'flex';
            document.getElementById('bottom-bar').style.display = 'none';
            break;
        case 'battle':
            document.getElementById('battle-screen').style.display = 'block';
            // 在地牢模式下调整显示
            mainResources.style.display = 'none';
            dungeonResources.style.display = 'flex';
            pauseButton.style.display = 'flex';
            document.getElementById('bottom-bar').style.display = 'none';
            // 初始化羁绊图标
            if (typeof initSynergyIcons === 'function') {
                initSynergyIcons();
            }
            break;
        case 'dungeon-shop':
            document.getElementById('dungeon-shop').style.display = 'block';
            // 在地牢模式下调整显示
            mainResources.style.display = 'none';
            dungeonResources.style.display = 'flex';
            pauseButton.style.display = 'flex';
            document.getElementById('bottom-bar').style.display = 'none';
            break;
        case 'partners':
            document.getElementById('partners-screen').style.display = 'block';
            // 初始化伙伴系统
            if (window.initPartnersSystem) {
                window.initPartnersSystem();
            }
            break;
        case 'tavern':
            document.getElementById('tavern-screen').style.display = 'block';
            break;
    }
}

// 导航系统
document.addEventListener('DOMContentLoaded', function() {
    // DOM元素
    const battleModesScreen = document.getElementById('battle-modes');
    const unitSelectionScreen = document.getElementById('unit-selection');
    const dungeonMapScreen = document.getElementById('dungeon-map');
    const battleScreen = document.getElementById('battle-screen');
    const dungeonShopScreen = document.getElementById('dungeon-shop');
    const partnersScreen = document.getElementById('partners-screen');
    const tavernScreen = document.getElementById('tavern-screen');
    
    // 导航按钮
    const navBattleBtn = document.getElementById('nav-battle');
    const navPartnersBtn = document.getElementById('nav-partners');
    const navShopBtn = document.getElementById('nav-shop');
    const navInventoryBtn = document.getElementById('nav-inventory');
    const navResearchBtn = document.getElementById('nav-research');
    
    // 战斗模式按钮
    const dailyChallengeBtn = document.getElementById('daily-challenge');
    const endlessDungeonBtn = document.getElementById('endless-dungeon');
    const storyModeBtn = document.getElementById('story-mode');
    
    // 进入地牢按钮
    const enterDungeonBtn = document.getElementById('enter-dungeon');
    
    // 显示指定屏幕
    window.showScreen = function(screenId) {
        // 隐藏所有屏幕
        battleModesScreen.style.display = 'none';
        unitSelectionScreen.style.display = 'none';
        dungeonMapScreen.style.display = 'none';
        battleScreen.style.display = 'none';
        dungeonShopScreen.style.display = 'none';
        partnersScreen.style.display = 'none';
        tavernScreen.style.display = 'none';
        
        // 显示指定屏幕
        switch (screenId) {
            case 'battle-modes':
                battleModesScreen.style.display = 'flex';
                break;
            case 'unit-selection':
                unitSelectionScreen.style.display = 'flex';
                break;
            case 'dungeon-map':
                dungeonMapScreen.style.display = 'block';
                break;
            case 'battle':
                battleScreen.style.display = 'block';
                break;
            case 'dungeon-shop':
                dungeonShopScreen.style.display = 'block';
                break;
            case 'partners':
                partnersScreen.style.display = 'block';
                // 初始化伙伴系统
                if (window.initPartnersSystem) {
                    window.initPartnersSystem();
                }
                break;
            case 'tavern':
                tavernScreen.style.display = 'block';
                break;
        }
    };
    
    // 设置导航按钮点击事件
    navBattleBtn.addEventListener('click', function() {
        // 切换到战斗模式选择界面
        showScreen('battle-modes');
        
        // 更新导航按钮状态
        updateNavButtons(this);
    });
    
    navPartnersBtn.addEventListener('click', function() {
        // 切换到伙伴系统界面
        showScreen('partners');
        
        // 更新导航按钮状态
        updateNavButtons(this);
    });
    
    // 酒馆按钮点击事件
    navShopBtn.addEventListener('click', function() {
        // 切换到酒馆界面
        showScreen('tavern');
        
        // 更新导航按钮状态
        updateNavButtons(this);
    });
    
    navInventoryBtn.addEventListener('click', function() {
        alert('背包功能即将推出！');
    });
    
    navResearchBtn.addEventListener('click', function() {
        alert('研究功能即将推出！');
    });
    
    // 战斗模式按钮点击事件
    dailyChallengeBtn.addEventListener('click', function() {
        alert('每日挑战功能即将推出！');
    });
    
    endlessDungeonBtn.addEventListener('click', function() {
        // 进入无限地牢模式的单位选择界面
        gameState.gameMode = 'endless';
        showScreen('unit-selection');
        generateRandomUnits();
    });
    
    storyModeBtn.addEventListener('click', function() {
        alert('故事模式功能即将推出！');
    });
    
    // 进入地牢按钮点击事件
    enterDungeonBtn.addEventListener('click', function() {
        // 进入地牢地图界面
        showScreen('dungeon-map');
        
        // 设置地牢等级
        gameState.dungeon.level = 1;
        
        // 生成地牢地图
        generateDungeonMap();
        
        // 添加地牢模式类
        document.getElementById('game-container').classList.add('dungeon-mode');
        
        // 显示地牢资源
        document.querySelector('.main-resources').style.display = 'none';
        document.querySelector('.dungeon-resources').style.display = 'flex';
        
        // 显示暂停按钮
        document.getElementById('pause-button').style.display = 'block';
        
        // 更新队伍数量显示
        updateTeamCount();
    });
    
    // 更新导航按钮状态
    function updateNavButtons(activeButton) {
        // 移除所有导航按钮的active类
        navBattleBtn.classList.remove('active');
        navPartnersBtn.classList.remove('active');
        navShopBtn.classList.remove('active');
        navInventoryBtn.classList.remove('active');
        navResearchBtn.classList.remove('active');
        
        // 为当前活动按钮添加active类
        activeButton.classList.add('active');
    }
    
    // 初始显示战斗模式选择界面
    showScreen('battle-modes');
});