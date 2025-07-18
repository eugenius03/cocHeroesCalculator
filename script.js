document.addEventListener('DOMContentLoaded', () => {
    const unitSelectionContainer = document.getElementById('unit-selection');
    const calculatorSection = document.getElementById('calculator-section');
    const unitNameEl = document.getElementById('unit-name');
    const upgradeTableBody = document.querySelector('#upgrade-table tbody');
    const upgradeTableHead = document.querySelector('#upgrade-table thead tr');
    const summaryContentEl = document.getElementById('summary-content');
    const discountCheckbox = document.getElementById('discount-checkbox');
    const currentLevelInput = document.getElementById('current-level-input');
    const desiredLevelInput = document.getElementById('desired-level-input');
    const summaryTitleEl = document.getElementById('summary-title');
    const languageSwitcher = document.getElementById('language-switcher');


    const unitFiles = ['barbarianKing.json', 'archerQueen.json',
        'minionPrince.json','grandWarden.json', 'royalChampion.json',
        'battleMachine.json', 'battleCopter.json' ];
    let unitsData = {};
    let activeUnit = null;
    let translations = {};
    let currentLanguage = localStorage.getItem('lang') || 'en';

    const langButtons = document.querySelectorAll('#language-switcher button');

    langButtons.forEach(button => {
        if (button.dataset.lang === currentLanguage) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    async function loadTranslations(lang) {
        const response = await fetch(`languages/${lang}.json`);
        translations = await response.json();
        currentLanguage = lang;
        document.documentElement.lang = lang;
        updateUIWithTranslations();
    }

    function updateUIWithTranslations() {
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (translations[key]) {
                el.textContent = translations[key];
            }
        });
        
        
        if (Object.keys(unitsData).length > 0) {
            createUnitCards();
        }
        if (activeUnit) {
            const unit = unitsData[activeUnit];
            unitNameEl.textContent = translations[activeUnit];
            renderTable();
        }
    }

    async function loadData() {
        const promises = unitFiles.map(file => fetch("resources/json/"+file).then(res => res.json()));
        const results = await Promise.all(promises);
        
        unitFiles.forEach((file, index) => {
            const unitName = file.replace('.json', '');
            unitsData[unitName] = results[index];
        });

        createUnitCards();
    }

    function createUnitCards() {
        unitSelectionContainer.innerHTML = ''; 
        Object.keys(unitsData).forEach(name => {
            const unit = unitsData[name];
            const card = document.createElement('div');
            card.className = 'unit-card';
            card.dataset.unit = name;
            const translatedName = translations[name] || name;
            card.innerHTML = `
                <img src="${unit.icon}" alt="${translatedName}" width="75" height="100">
                <div class="name">${translatedName}</div>
            `;
            card.addEventListener('click', () => selectUnit(name));
            unitSelectionContainer.appendChild(card);
        });
        
        if(activeUnit) {
             const activeCard = unitSelectionContainer.querySelector(`.unit-card[data-unit="${activeUnit}"]`);
             if(activeCard) activeCard.classList.add('active');
        }
    }

    function selectUnit(name) {
        activeUnit = name;
        const unit = unitsData[activeUnit];
        
        document.querySelectorAll('.unit-card').forEach(card => {
            card.classList.toggle('active', card.dataset.unit === name);
        });

        calculatorSection.classList.remove('hidden');
        unitNameEl.textContent = translations[name];

        currentLevelInput.value = currentLevelInput.value || 1;
        currentLevelInput.max = unit.maxLevel - 1;
        desiredLevelInput.value = desiredLevelInput.value || unit.maxLevel;
        desiredLevelInput.max = unit.maxLevel;
        
        renderTable();
    }

    function renderTable() {
        if (!activeUnit) return;

        const unit = unitsData[activeUnit];
        const isDiscounted = discountCheckbox.checked;
        const currentLevel = parseInt(currentLevelInput.value, 10);
        const desiredLevel = parseInt(desiredLevelInput.value, 10);

        if (currentLevel >= desiredLevel) {
            upgradeTableBody.innerHTML = `<tr><td colspan="4">${translations.levelError}</td></tr>`;
            renderSummary(0, 0);
            return;
        }

        const upgradesToShow = unit.upgrades.filter(upgrade => 
            upgrade.level >= currentLevel && upgrade.level < desiredLevel
        );

        upgradeTableBody.innerHTML = '';
        let totalCost = 0;
        let totalTime = 0;

        
        upgradeTableHead.querySelector('[data-lang-key="level"]').textContent = translations.level;
        upgradeTableHead.querySelector('[data-lang-key="upgradeCost"]').textContent = translations.upgradeCost;
        upgradeTableHead.querySelector('[data-lang-key="upgradeTime"]').textContent = translations.upgradeTime;
        const hallHeader = upgradeTableHead.querySelector('th:last-child');

        if (upgradesToShow.length === 0 && currentLevel < desiredLevel) {
            upgradeTableBody.innerHTML = `<tr><td colspan="4">${translations.noUpgrades}</td></tr>`;
        } else {
            const isBuilder = !!(unit.upgrades[0].builderHall || unit.upgrades[0].builderElixir);
            hallHeader.textContent = isBuilder ? translations.builderHallLevel : translations.heroHallLevel;

            upgradesToShow.forEach(upgrade => {
                const cost = upgrade.elixir || upgrade.darkElixir || upgrade.builderElixir;
                const timeInHours = upgrade.timeInHours;
                const heroHall = upgrade.heroHall || upgrade.builderHall;

                const discountedCost = isDiscounted ? Math.round(cost * 0.8) : cost;
                const discountedTime = isDiscounted ? timeInHours * 0.8 : timeInHours;

                totalCost += discountedCost;
                totalTime += discountedTime;
                
                var costType = translations.darkElixir;
                if (upgrade.elixir) costType = translations.elixir;
                if (upgrade.builderElixir) costType = translations.builderElixir;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${upgrade.level}</td>
                    <td class="${isDiscounted ? 'discounted' : ''}">${discountedCost.toLocaleString()} ${costType}</td>
                    <td class="${isDiscounted ? 'discounted' : ''}">${formatTime(discountedTime)}</td>
                    <td>${heroHall}</td>
                `;
                upgradeTableBody.appendChild(row);
            });
        }

        renderSummary(totalCost, totalTime);
    }

    function renderSummary(totalCost, totalTime) {
        const unit = unitsData[activeUnit];
        let costType = translations.darkElixir;
        if (unit.upgrades[0].elixir) costType = translations.elixir;
        if (unit.upgrades[0].builderElixir) costType = translations.builderElixir;

        const currentLevel = parseInt(currentLevelInput.value, 10);
        const desiredLevel = parseInt(desiredLevelInput.value, 10);

        if (desiredLevel === unit.maxLevel && currentLevel === 1) {
            summaryTitleEl.textContent = translations.totalToMax;
        } else {
            summaryTitleEl.textContent = translations.totalForSelectedLevels
                .replace('{currentLevel}', currentLevel)
                .replace('{desiredLevel}', desiredLevel);
        }
        
        summaryContentEl.innerHTML = `
            <p><strong>${translations.totalCost}</strong> <span class="${discountCheckbox.checked ? 'discounted' : ''}">${totalCost.toLocaleString()} ${costType}</span></p>
            <p><strong>${translations.totalTime}</strong> <span class="${discountCheckbox.checked ? 'discounted' : ''}">${formatTime(totalTime)}</span></p>
        `;
    }

    function formatTime(hours) {
    const totalMinutes = Math.round(hours * 60); 
    const d = Math.floor(totalMinutes / 1440);   
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;

    const showDay = translations.day;
    const showHour = translations.hour;
    const showMinute = translations.minute;

    const parts = [];

    if (d > 0) {
        parts.push(`${d}${showDay}`);
    }
    if (h > 0) {
        parts.push(`${h}${showHour}`);
    }
    if (m > 0 || parts.length === 0) {
        parts.push(`${m}${showMinute}`);
    }

    return parts.join(' ');
}

    
    discountCheckbox.addEventListener('change', renderTable);
    currentLevelInput.addEventListener('change', renderTable);
    desiredLevelInput.addEventListener('change', renderTable);

    languageSwitcher.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const lang = e.target.dataset.lang;
            if (lang !== currentLanguage) {
                loadTranslations(lang);
                languageSwitcher.querySelector('button.active').classList.remove('active');
                e.target.classList.add('active');
                localStorage.setItem("lang", lang);
            }
        }
    });

    async function initializeApp() {
        await loadTranslations(currentLanguage);
        languageSwitcher
        await loadData();
    }

    initializeApp();
});