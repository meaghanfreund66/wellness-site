// constants

// meal planner consts
const planInputs = {
  breakfastCalories: document.getElementById('breakfastCalories'),
  breakfastProtein: document.getElementById('breakfastProtein'),
  lunchCalories: document.getElementById('lunchCalories'),
  lunchProtein: document.getElementById('lunchProtein'),
  dinnerCalories: document.getElementById('dinnerCalories'),
  dinnerProtein: document.getElementById('dinnerProtein'),
};
const plannedCalories = document.getElementById('plannedCalories');
const plannedProtein = document.getElementById('plannedProtein');
const actualCalories = document.getElementById('actualCalories');
const actualProtein = document.getElementById('actualProtein');
const foodLog = document.getElementById('foodLog');
const foodNameInput = document.getElementById('foodName');
const foodCaloriesInput = document.getElementById('foodCalories');
const foodProteinInput = document.getElementById('foodProtein');
const savePlanButton = document.getElementById('savePlanButton');
const addFoodButton = document.getElementById('addFoodButton');
// planned snack inputs for the plan
const plannedSnackNameInput = document.getElementById('plannedSnackName');
const plannedSnackCaloriesInput = document.getElementById('plannedSnackCalories');
const plannedSnackProteinInput = document.getElementById('plannedSnackProtein');
const addPlannedSnackButton = document.getElementById('addPlannedSnackButton');
const plannedSnackList = document.getElementById('plannedSnackList');


// save days of the week (without DB for now)
const STORAGE_KEY = 'wellnessMealPlanner';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const daySelector = document.getElementById('daySelector');
let currentDay = null;

const initialState = {
  plan: {
    breakfastCalories: 0,
    breakfastProtein: 0,
    lunchCalories: 0,
    lunchProtein: 0,
    dinnerCalories: 0,
    dinnerProtein: 0,
    plannedSnacks: []
  },
  actualItems: [],
};

// Ensure there's a global storage object with an entry for each weekday
function ensureGlobalData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let data;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // migrate older single-day shape (top-level plan/actualItems) into new days map
      if (parsed && !parsed.days && (parsed.plan || parsed.actualItems)) {
        const idx = new Date().getDay();
        const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][idx];
        data = { days: {}, selectedDay: DAYS.includes(dayName) ? dayName : 'Monday' };
        // place old data into today's slot
        data.days[data.selectedDay] = parsed;
      } else {
        data = parsed;
      }
    } catch (e) {
      data = { days: {}, selectedDay: null };
    }
  } else {
    data = { days: {}, selectedDay: null };
  }

  DAYS.forEach((d) => {
    if (!data.days[d]) {
      // deep copy of initialState
      data.days[d] = JSON.parse(JSON.stringify(initialState));
    }
  });
  if (!data.selectedDay) {
    // default to today's weekday (map 0=Sun..6=Sat -> name)
    const idx = new Date().getDay();
    const dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][idx];
    data.selectedDay = DAYS.includes(dayName) ? dayName : 'Monday';
  }
  return data;
}

// Load the state for the currently selected day
function loadState() {
  const data = ensureGlobalData();
  if (!currentDay) currentDay = data.selectedDay;
  return data.days[currentDay];
}

// Save the provided day-state into the global store under the currently selected day
function saveState(state) {
  const data = ensureGlobalData();
  data.days[currentDay] = state;
  data.selectedDay = currentDay;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Set the active day and re-render
function setCurrentDay(dayName) {
  currentDay = dayName;
  const data = ensureGlobalData();
  data.selectedDay = dayName;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  updateDaySelectorUI();
  render(loadState());
}

function updateDaySelectorUI() {
  if (!daySelector) return;
  daySelector.querySelectorAll('.day').forEach(el => {
    el.classList.toggle('day-selected', el.getAttribute('data-day') === currentDay);
  });
}

// Render day selector buttons
function renderDaySelector() {
  if (!daySelector) return;
  daySelector.innerHTML = '';
  DAYS.forEach((d, i) => {
    const btn = document.createElement('div');
    btn.className = 'day';
    btn.setAttribute('data-day', d);
    btn.setAttribute('title', d);
    btn.textContent = DAY_LABELS[i];
    btn.addEventListener('click', () => setCurrentDay(d));
    daySelector.appendChild(btn);
  });
}

// Initialize selector and currentDay on load
renderDaySelector();
const stored = ensureGlobalData();
currentDay = stored.selectedDay || currentDay || 'Monday';
updateDaySelectorUI();

function calculatePlanTotals(plan) {
  const snackTotals = (plan.plannedSnacks || []).reduce((acc, s) => {
    acc.calories += Number(s.calories) || 0;
    acc.protein += Number(s.protein) || 0;
    return acc;
  }, { calories: 0, protein: 0 });

  const calories =
    Number(plan.breakfastCalories) +
    Number(plan.lunchCalories) +
    Number(plan.dinnerCalories) +
    snackTotals.calories;
  const protein =
    Number(plan.breakfastProtein) +
    Number(plan.lunchProtein) +
    Number(plan.dinnerProtein) +
    snackTotals.protein;
  return { calories, protein };
}

function calculateActualTotals(items) {
  return items.reduce(
    (totals, item) => {
      totals.calories += Number(item.calories);
      totals.protein += Number(item.protein);
      return totals;
    },
    { calories: 0, protein: 0 }
  );
}

function renderPlan(state) {
  Object.keys(planInputs).forEach((key) => {
    planInputs[key].value = state.plan[key] || 0;
  });

  // render planned snacks list
  if (plannedSnackList) {
    plannedSnackList.innerHTML = '';
    (state.plan.plannedSnacks || []).forEach((s, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${s.name || 'Snack'}</span>
        <strong>${s.calories} cal</strong>
        <strong>${s.protein} g</strong>
        <button data-idx="${idx}" class="btn btn-link delete-planned-snack">Delete</button>
      `;
      plannedSnackList.appendChild(li);
    });

    // attach delete handlers
    plannedSnackList.querySelectorAll('.delete-planned-snack').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = Number(e.currentTarget.getAttribute('data-idx'));
        const st = loadState();
        st.plan.plannedSnacks.splice(index, 1);
        saveState(st);
        render(st);
      });
    });
  }

  const totals = calculatePlanTotals(state.plan);
  plannedCalories.textContent = totals.calories;
  plannedProtein.textContent = totals.protein;
}

function renderActual(state) {
  const totals = calculateActualTotals(state.actualItems);
  actualCalories.textContent = totals.calories;
  actualProtein.textContent = totals.protein;
  foodLog.innerHTML = '';
  state.actualItems.forEach((item) => {
    const entry = document.createElement('li');
    entry.innerHTML = `
      <span>${item.name || 'Unnamed item'}</span>
      <strong>${item.calories} cal</strong>
      <strong>${item.protein} g</strong>
    `;
    foodLog.appendChild(entry);
  });
}

function render(state) {
  renderPlan(state);
  renderActual(state);
}

function handleSavePlan() {
  const state = loadState();
  Object.keys(planInputs).forEach((key) => {
    state.plan[key] = Number(planInputs[key].value) || 0;
  });
  saveState(state);
  render(state);
}

function handleAddFood() {
  const name = foodNameInput.value.trim();
  const calories = Number(foodCaloriesInput.value) || 0;
  const protein = Number(foodProteinInput.value) || 0;
  if (calories === 0 && protein === 0 && name === '') {
    alert('Add at least one field for calories, protein, or a name.');
    return;
  }

  const state = loadState();
  state.actualItems.push({ name, calories, protein });
  saveState(state);
  foodNameInput.value = '';
  foodCaloriesInput.value = 0;
  foodProteinInput.value = 0;
  render(state);
}

savePlanButton.addEventListener('click', handleSavePlan);
addFoodButton.addEventListener('click', handleAddFood);

// Live update: listen for changes to plan inputs and persist immediately
Object.keys(planInputs).forEach((key) => {
  const el = planInputs[key];
  el.addEventListener('input', () => {
    const state = loadState();
    // if numeric fields, coerce to number
    state.plan[key] = el.type === 'number' ? (Number(el.value) || 0) : el.value;
    saveState(state);
    render(state);
  });
});

// Add planned snack handler
if (addPlannedSnackButton) {
  addPlannedSnackButton.addEventListener('click', () => {
    const name = (plannedSnackNameInput && plannedSnackNameInput.value.trim()) || '';
    const calories = Number(plannedSnackCaloriesInput.value) || 0;
    const protein = Number(plannedSnackProteinInput.value) || 0;
    if (!name && calories === 0 && protein === 0) {
      alert('Add at least a snack name, calories, or protein.');
      return;
    }
    const state = loadState();
    state.plan.plannedSnacks = state.plan.plannedSnacks || [];
    state.plan.plannedSnacks.push({ name, calories, protein });
    saveState(state);
    if (plannedSnackNameInput) plannedSnackNameInput.value = '';
    if (plannedSnackCaloriesInput) plannedSnackCaloriesInput.value = 0;
    if (plannedSnackProteinInput) plannedSnackProteinInput.value = 0;
    render(state);
  });
}

render(loadState());
