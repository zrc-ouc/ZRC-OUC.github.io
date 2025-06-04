// 伙伴系统数据
const partnerData = {
    // 火系伙伴
    fire: [
        {
            id: 'fire',
            name: '拳击手',
            element: 'fire',
            icon: '👊',
            job: 'warrior',
            level: 1,
            hp: 10,
            attack: 3,
            speed: 1,
            unlocked: true,
            skills: [
                {
                    name: '暴击',
                    description: '造成150%伤害',
                    unlockLevel: 1
                },
                {
                    name: '反击',
                    description: '当受到攻击时，有30%几率反击敌人，造成50%攻击力的伤害。',
                    unlockLevel: 2
                },
                {
                    name: '血怒',
                    description: '生命值低于30%时，攻击力提升50%。',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'fireGunner',
            name: '火枪手',
            element: 'fire',
            icon: '🔫',
            job: 'ranged',
            level: 1,
            hp: 8,
            attack: 4,
            speed: 2,
            unlocked: true,
            skills: [
                {
                    name: '双发',
                    description: '连续发动2次80%攻击',
                    unlockLevel: 1
                },
                {
                    name: '穿透',
                    description: '发动双发技能时每次攻击会额外对与攻击目标处于同一列且最近的1名对方单位造成当前攻击力50%的伤害',
                    unlockLevel: 2
                },
                {
                    name: '爆头',
                    description: '发动双发技能时，若攻击目标血量低于10%，每次攻击有5%的概率直接秒杀该单位',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'fireMage',
            name: '火焰法师',
            element: 'fire',
            icon: '🔮',
            job: 'mage',
            level: 1,
            hp: 8,
            attack: 4,
            speed: 1,
            unlocked: true,
            skills: [
                {
                    name: '火球',
                    description: '对九宫格内单位造成500%伤害',
                    unlockLevel: 1
                },
                {
                    name: '提纯',
                    description: '技能命中提升攻击力，提升数值为敌人数量×10',
                    unlockLevel: 2
                },
                {
                    name: '自爆',
                    description: '火球技能击杀目标发生自爆，对周围敌人造成伤害',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'fireSpear',
            name: '红缨枪',
            element: 'fire',
            icon: '⚔️',
            job: 'assassin',
            level: 3,
            hp: 30,
            attack: 12,
            speed: 2,
            unlocked: false,
            skills: [
                {
                    name: '列杀',
                    description: '普通攻击对同列所有敌人造成伤害',
                    unlockLevel: 3
                },
                {
                    name: '灼烧',
                    description: '被技能命中的对方单位全部添加"灼烧"印记，每回合受到20%攻击力的伤害，持续3回合',
                    unlockLevel: 3
                },
                {
                    name: '炎之刃',
                    description: '攻击附带火焰伤害，造成额外20%攻击力的伤害',
                    unlockLevel: 3
                }
            ]
        }
    ],
    
    // 水系伙伴
    water: [
        {
            id: 'water',
            name: '消防员',
            element: 'water',
            icon: '💧',
            job: 'warrior',
            level: 1,
            hp: 12,
            attack: 2,
            speed: 1,
            unlocked: true,
            skills: [
                {
                    name: '水压',
                    description: '造成普通攻击伤害，并有30%几率击退敌人',
                    unlockLevel: 1
                },
                {
                    name: '水盾',
                    description: '受到攻击时，有30%几率减少50%伤害。',
                    unlockLevel: 2
                },
                {
                    name: '孤身',
                    description: '当周围没有其他友方单位时，攻击力和生命值提升30%。',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'waterDiver',
            name: '潜水员',
            element: 'water',
            icon: '🤿',
            job: 'assassin',
            level: 1,
            hp: 8,
            attack: 4,
            speed: 3,
            unlocked: true,
            skills: [
                {
                    name: '水牢',
                    description: '造成50%的伤害，使敌人无法行动2回合',
                    unlockLevel: 1
                },
                {
                    name: '窒息',
                    description: '对"无法行动"单位造成300%的伤害',
                    unlockLevel: 2
                },
                {
                    name: '潜水',
                    description: '释放水牢后进入隐身状态，无法被选择为攻击目标，持续2回合',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'waterMage',
            name: '水魔法师',
            element: 'water',
            icon: '🌊',
            job: 'mage',
            level: 1,
            hp: 8,
            attack: 3,
            speed: 2,
            unlocked: true,
            skills: [
                {
                    name: '水牢',
                    description: '将敌人困在水牢中，使其无法行动1回合。',
                    unlockLevel: 1
                },
                {
                    name: '链接',
                    description: '链接一个友方单位，分享治疗效果',
                    unlockLevel: 2
                },
                {
                    name: '自愈',
                    description: '每回合恢复1点生命值。',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'frostMage',
            name: '冰霜术士',
            element: 'water',
            icon: '❄️',
            job: 'mage',
            level: 3,
            hp: 24,
            attack: 10,
            speed: 3,
            unlocked: false,
            skills: [
                {
                    name: '冰霜新星',
                    description: '对周围所有敌人造成伤害，并有50%几率使其冻结1回合。',
                    unlockLevel: 3
                },
                {
                    name: '寒冰护体',
                    description: '受到攻击时，对攻击者造成2点冰霜伤害。',
                    unlockLevel: 3
                },
                {
                    name: '冰霜屏障',
                    description: '为自己和周围友方单位提供一个可以抵挡3点伤害的护盾。',
                    unlockLevel: 3
                }
            ]
        }
    ],
    
    // 电系伙伴
    electric: [
        {
            id: 'electricThor',
            name: '雷神',
            element: 'electric',
            icon: '🔨',
            job: 'warrior',
            level: 1,
            hp: 30,
            attack: 10,
            speed: 7,
            unlocked: true,
            skills: [
                {
                    name: '重锤',
                    description: '造成基于速度差值的伤害，并使目标无法行动2回合',
                    unlockLevel: 1
                },
                {
                    name: '静电',
                    description: '释放重锤时，对同行敌人造成50%伤害',
                    unlockLevel: 2
                },
                {
                    name: '激怒',
                    description: '每次受伤增加10攻击力，释放技能后重置',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'electricFlash',
            name: '雷电刺客',
            element: 'electric',
            icon: '⚡',
            job: 'assassin',
            level: 1,
            hp: 20,
            attack: 8,
            speed: 9,
            unlocked: true,
            skills: [
                {
                    name: '闪击',
                    description: '连续攻击敌人3次，每次造成60%伤害',
                    unlockLevel: 1
                },
                {
                    name: '增幅',
                    description: '释放闪击时，每次攻击有30%概率暴击，暴击时伤害翻倍',
                    unlockLevel: 2
                },
                {
                    name: '触电',
                    description: '释放闪击且发生暴击时，额外对距攻击目标最近的1名对方单位造成当前攻击力50%的伤害',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'electricWizard',
            name: '雷电术士',
            element: 'electric',
            icon: '🌩️',
            job: 'mage',
            level: 1,
            hp: 18,
            attack: 12,
            speed: 5,
            unlocked: true,
            skills: [
                {
                    name: '连锁闪电',
                    description: '攻击可以跳跃至最多3个敌人，每次跳跃伤害减少30%',
                    unlockLevel: 1
                },
                {
                    name: '静电场',
                    description: '周围敌人每回合有20%几率被麻痹1回合',
                    unlockLevel: 2
                },
                {
                    name: '充能',
                    description: '每回合增加10%攻击力，最多叠加3次',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'electricThunder',
            name: '雷霆射手',
            element: 'electric',
            icon: '🏹',
            job: 'ranged',
            level: 3,
            hp: 22,
            attack: 14,
            speed: 4,
            unlocked: false,
            skills: [
                {
                    name: '行杀',
                    description: '普通攻击对同行所有敌人造成伤害',
                    unlockLevel: 3
                },
                {
                    name: '雷霆一击',
                    description: '连续发动3次普通攻击',
                    unlockLevel: 3
                },
                {
                    name: '疾风步',
                    description: '攻击后有50%几率立即获得一次额外行动机会',
                    unlockLevel: 3
                }
            ]
        }
    ],
    
    // 土系伙伴
    earth: [
        {
            id: 'earthGuardian',
            name: '守护者',
            element: 'earth',
            icon: '🗿',
            job: 'warrior',
            level: 1,
            hp: 16,
            attack: 1,
            speed: 1,
            unlocked: true,
            skills: [
                {
                    name: '减速',
                    description: '攻击会减慢敌人50%的速度，持续1回合',
                    unlockLevel: 1
                },
                {
                    name: '石肤',
                    description: '受到的伤害减少1点',
                    unlockLevel: 2
                },
                {
                    name: '护盾',
                    description: '添加30%血量护盾',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'earth',
            name: '盗贼',
            element: 'earth',
            icon: '⛏️',
            job: 'assassin',
            level: 1,
            hp: 14,
            attack: 2,
            speed: 1,
            unlocked: true,
            skills: [
                {
                    name: '挖掘',
                    description: '造成普通攻击伤害，并有10%几率获得1个贝壳',
                    unlockLevel: 1
                },
                {
                    name: '坚韧',
                    description: '最大生命值提升20%',
                    unlockLevel: 2
                },
                {
                    name: '生存',
                    description: '首次生命值降为0时，立即回复30%生命值',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'earthPup',
            name: '傀儡师',
            element: 'earth',
            icon: '🎭',
            job: 'support',
            level: 1,
            hp: 50,
            attack: 0,
            speed: 1,
            unlocked: true,
            skills: [
                {
                    name: '傀儡',
                    description: '随机复制一名对方单位为己方傀儡',
                    unlockLevel: 1
                },
                {
                    name: '替身',
                    description: '自身复制的傀儡存活期间，傀儡师受到的伤害将由傀儡全部承担',
                    unlockLevel: 2
                },
                {
                    name: '陷阱',
                    description: '自身复制的傀儡死亡时，立即对同一列所有对方单位造成当前傀儡师剩余血量100%的伤害',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'lavaGuardian',
            name: '熔岩守护者',
            element: 'earth',
            icon: '🌋',
            job: 'warrior',
            level: 3,
            hp: 40,
            attack: 8,
            speed: 1,
            unlocked: false,
            skills: [
                {
                    name: '熔岩护甲',
                    description: '受到攻击时，对攻击者造成3点火焰伤害',
                    unlockLevel: 3
                },
                {
                    name: '地震',
                    description: '对所有敌人造成5点伤害',
                    unlockLevel: 3
                },
                {
                    name: '熔岩喷发',
                    description: '攻击有30%几率使目标灼烧，每回合受到2点伤害，持续2回合',
                    unlockLevel: 3
                }
            ]
        }
    ],
    
    // 草系伙伴
    grass: [
        {
            id: 'grassBiochemist',
            name: '生化员',
            element: 'grass',
            icon: '🧪',
            job: 'ranged',
            level: 1,
            hp: 9,
            attack: 3,
            speed: 2,
            unlocked: true,
            skills: [
                {
                    name: '毒素',
                    description: '攻击使敌人中毒，每回合受到1点伤害，持续2回合',
                    unlockLevel: 1
                },
                {
                    name: '疲倦',
                    description: '中毒的敌人每回合减少10点蓝量',
                    unlockLevel: 2
                },
                {
                    name: '传染',
                    description: '中毒的敌人死亡后，将中毒状态转移至未中毒的敌人，中毒回合数重置为3',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'grass',
            name: '花仙子',
            element: 'grass',
            icon: '🌿',
            job: 'support',
            level: 1,
            hp: 8,
            attack: 2,
            speed: 2,
            unlocked: true,
            skills: [
                {
                    name: '鼓舞',
                    description: '提升友方单位1点攻击力，持续2回合',
                    unlockLevel: 1
                },
                {
                    name: '激励',
                    description: '提升友方单位30%速度，持续2回合',
                    unlockLevel: 2
                },
                {
                    name: '生命绽放',
                    description: '每回合为周围友方单位恢复1点生命值',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'grassNun',
            name: '修女',
            element: 'grass',
            icon: '✝️',
            job: 'mage',
            level: 1,
            hp: 80,
            attack: 100,
            speed: 3,
            unlocked: true,
            skills: [
                {
                    name: '回复',
                    description: '对最低血量单位回复300%血量',
                    unlockLevel: 1
                },
                {
                    name: '净化',
                    description: '主动技能给己方单位回血的同时，移除回血目标携带的所有负面效果',
                    unlockLevel: 2
                },
                {
                    name: '复活',
                    description: '记录战斗中己方死亡的第一个单位，在其血量首次小于0时，立即回复50%初始血量',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'lotusNymph',
            name: '莲花仙女',
            element: 'grass',
            icon: '🌺',
            job: 'support',
            level: 3,
            hp: 25,
            attack: 5,
            speed: 3,
            unlocked: false,
            skills: [
                {
                    name: '治愈之风',
                    description: '每回合为所有友方单位恢复1点生命值',
                    unlockLevel: 3
                },
                {
                    name: '不染',
                    description: '净化所有友方单位的负面状态，并恢复5点生命值',
                    unlockLevel: 3
                },
                {
                    name: '生命绽放',
                    description: '友方单位死亡时，为所有存活的友方单位恢复3点生命值',
                    unlockLevel: 3
                }
            ]
        }
    ],
    
    // 特殊伙伴
    special: [
        {
            id: 'holyWarrior',
            name: '圣战士',
            element: 'special',
            icon: '✝️',
            job: 'warrior',
            level: 3,
            hp: 35,
            attack: 12,
            speed: 2,
            unlocked: false,
            skills: [
                {
                    name: '神圣打击',
                    description: '攻击造成150%伤害，并有30%几率使敌人眩晕1回合。',
                    unlockLevel: 3
                },
                {
                    name: '神圣护盾',
                    description: '为自己或友方单位提供一个可以完全抵挡一次攻击的护盾。',
                    unlockLevel: 3
                },
                {
                    name: '神圣光辉',
                    description: '周围友方单位受到的伤害减少20%。',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'darkQueen',
            name: '暗夜女王',
            element: 'special',
            icon: '👑',
            job: 'assassin',
            level: 3,
            hp: 30,
            attack: 10,
            speed: 3,
            unlocked: false,
            skills: [
                {
                    name: '蝙蝠召唤',
                    description: '召唤蝙蝠攻击敌人，每只蝙蝠造成2点伤害。',
                    unlockLevel: 3
                },
                {
                    name: '生命汲取',
                    description: '攻击时吸取敌人20%的生命值。',
                    unlockLevel: 3
                },
                {
                    name: '献祭',
                    description: '可以献祭友方单位，增加自身属性并获得一只蝙蝠。',
                    unlockLevel: 3
                }
            ]
        },
        {
            id: 'motherOfLife',
            name: '生命之母',
            element: 'special',
            icon: '🌱',
            job: 'support',
            level: 3,
            hp: 40,
            attack: 5,
            speed: 2,
            unlocked: false,
            skills: [
                {
                    name: '生命之泉',
                    description: '恢复所有友方单位30%的生命值。',
                    unlockLevel: 3
                },
                {
                    name: '禁锢',
                    description: '使所有敌人无法行动1回合。',
                    unlockLevel: 3
                },
                {
                    name: '龙蛋',
                    description: '可以购买龙蛋放置在战场上，有几率孵化为巨龙。',
                    unlockLevel: 3
                }
            ]
        }
    ]
};

// 伙伴系统初始化
function initPartnersSystem() {
    const partnersGrid = document.getElementById('partners-grid');
    
    // 清空网格
    partnersGrid.innerHTML = '';
    
    // 更新伙伴解锁状态
    updatePartnersUnlockStatus();
    
    // 添加火系伙伴 (第一行)
    addPartnerRow(partnersGrid, partnerData.fire);
    
    // 添加水系伙伴 (第二行)
    addPartnerRow(partnersGrid, partnerData.water);
    
    // 添加电系伙伴 (第三行)
    addPartnerRow(partnersGrid, partnerData.electric);
    
    // 添加土系伙伴 (第四行)
    addPartnerRow(partnersGrid, partnerData.earth);
    
    // 添加草系伙伴 (第五行)
    addPartnerRow(partnersGrid, partnerData.grass);
    
    // 添加特殊伙伴 (第六行)
    addPartnerRow(partnersGrid, partnerData.special);
    
    // 设置伙伴详情弹窗关闭按钮事件
    document.querySelector('.close-details').addEventListener('click', closePartnerDetails);
    
    // 设置伙伴详情背景点击关闭事件
    document.getElementById('partner-details-overlay').addEventListener('click', closePartnerDetails);
}

// 根据gameState更新伙伴解锁状态
function updatePartnersUnlockStatus() {
    // 遍历所有伙伴类型
    for (const elementType in partnerData) {
        if (partnerData.hasOwnProperty(elementType)) {
            // 遍历该类型下的所有伙伴
            partnerData[elementType].forEach(partner => {
                // 根据gameState中的解锁状态更新伙伴的unlocked属性
                partner.unlocked = gameState.unlockedPartners[partner.id] === true;
            });
        }
    }
}

// 添加一行伙伴卡片
function addPartnerRow(container, partners) {
    partners.forEach(partner => {
        const card = createPartnerCard(partner);
        container.appendChild(card);
    });
}

// 创建伙伴卡片
function createPartnerCard(partner) {
    const card = document.createElement('div');
    card.className = `partner-card ${partner.unlocked ? 'unlocked' : 'locked'}`;
    card.dataset.partnerId = partner.id;
    
    const icon = document.createElement('div');
    icon.className = `partner-icon partner-${partner.element}`;
    
    // 如果伙伴已解锁，显示图标，否则显示问号
    if (partner.unlocked) {
        icon.textContent = partner.icon;
    } else {
        icon.textContent = '❓';
        icon.classList.add('locked-icon');
    }
    
    const name = document.createElement('div');
    name.className = 'partner-name';
    
    // 如果伙伴已解锁，显示名称，否则显示"未解锁"
    if (partner.unlocked) {
        name.textContent = partner.name;
    } else {
        name.textContent = '未解锁';
    }
    
    const level = document.createElement('div');
    level.className = 'partner-level';
    level.textContent = partner.unlocked ? `Lv${partner.level}` : '';
    
    const element = document.createElement('div');
    element.className = 'partner-element';
    element.textContent = partner.unlocked ? getElementIcon(partner.element) : '';
    
    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(level);
    card.appendChild(element);
    
    // 只有解锁的伙伴才能点击查看详情
    if (partner.unlocked) {
        card.addEventListener('click', () => showPartnerDetails(partner));
    }
    
    return card;
}

// 获取元素图标
function getElementIcon(element) {
    const icons = {
        fire: '🔥',
        water: '💧',
        electric: '⚡',
        earth: '🌑',
        grass: '🌿',
        special: '✨'
    };
    return icons[element] || '❓';
}

// 显示伙伴详情
function showPartnerDetails(partner) {
    const detailsOverlay = document.getElementById('partner-details-overlay');
    const details = document.getElementById('partner-details');
    
    // 设置伙伴图标
    const icon = details.querySelector('.partner-details-icon');
    icon.className = `partner-details-icon partner-${partner.element}`;
    icon.textContent = partner.icon;
    
    // 设置伙伴名称
    details.querySelector('.partner-details-name').textContent = partner.name;
    
    // 设置伙伴属性
    details.querySelector('.partner-details-stat.hp').textContent = `❤️ ${partner.hp}`;
    details.querySelector('.partner-details-stat.attack').textContent = `⚔️ ${partner.attack}`;
    details.querySelector('.partner-details-stat.speed').textContent = `⚡ ${partner.speed}`;
    
    // 设置伙伴技能
    const skillsContainer = details.querySelector('.partner-details-skills');
    skillsContainer.innerHTML = '';
    
    partner.skills.forEach(skill => {
        const skillItem = document.createElement('div');
        skillItem.className = 'skill-item';
        
        const skillName = document.createElement('div');
        skillName.className = 'skill-name';
        skillName.textContent = skill.name;
        
        const skillDesc = document.createElement('div');
        skillDesc.className = 'skill-description';
        skillDesc.textContent = skill.description;
        
        // 如果技能需要特定等级才能解锁
        if (skill.unlockLevel > partner.level) {
            skillItem.classList.add('locked');
            skillDesc.textContent += ` (需要Lv${skill.unlockLevel}解锁)`;
        }
        
        skillItem.appendChild(skillName);
        skillItem.appendChild(skillDesc);
        skillsContainer.appendChild(skillItem);
    });
    
    // 显示详情弹窗
    detailsOverlay.style.display = 'block';
    details.style.display = 'block';
}

// 关闭伙伴详情
function closePartnerDetails() {
    document.getElementById('partner-details-overlay').style.display = 'none';
    document.getElementById('partner-details').style.display = 'none';
}

// 导出函数
window.initPartnersSystem = initPartnersSystem; 