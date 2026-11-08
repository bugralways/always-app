const STORAGE_KEY = "haftam-profile-v1";
const weekdays = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const meals = [
  { name: "Mercimek çorbası ve salata", minutes: 25, cost: 42, vegetarian: true, dairyFree: true, spicy: false, ingredients: ["Kırmızı mercimek", "Soğan", "Havuç", "Marul", "Domates"] },
  { name: "Nohutlu sebze yemeği", minutes: 30, cost: 48, vegetarian: true, dairyFree: true, spicy: false, ingredients: ["Nohut", "Kabak", "Domates", "Soğan", "Pirinç"] },
  { name: "Sebzeli makarna", minutes: 25, cost: 45, vegetarian: true, dairyFree: false, spicy: false, ingredients: ["Makarna", "Kabak", "Domates", "Kaşar peyniri"] },
  { name: "Fırında tavuk ve sebze", minutes: 40, cost: 85, vegetarian: false, dairyFree: true, spicy: false, ingredients: ["Tavuk", "Patates", "Havuç", "Soğan"] },
  { name: "Tavuklu bulgur pilavı", minutes: 30, cost: 72, vegetarian: false, dairyFree: true, spicy: false, ingredients: ["Tavuk", "Bulgur", "Biber", "Soğan"] },
  { name: "Kuru fasulye ve pilav", minutes: 35, cost: 55, vegetarian: true, dairyFree: true, spicy: false, ingredients: ["Kuru fasulye", "Pirinç", "Soğan", "Domates"] },
  { name: "Sebzeli omlet ve salata", minutes: 20, cost: 46, vegetarian: true, dairyFree: false, spicy: false, ingredients: ["Yumurta", "Biber", "Domates", "Marul"] },
  { name: "Acılı nohutlu dürüm", minutes: 25, cost: 52, vegetarian: true, dairyFree: true, spicy: true, ingredients: ["Nohut", "Lavaş", "Marul", "Domates", "Acı biber"] },
  { name: "Acılı tavuk sote", minutes: 30, cost: 78, vegetarian: false, dairyFree: true, spicy: true, ingredients: ["Tavuk", "Biber", "Soğan", "Pirinç", "Acı biber"] },
  { name: "Zeytinyağlı sebze ve bulgur", minutes: 30, cost: 50, vegetarian: true, dairyFree: true, spicy: false, ingredients: ["Kabak", "Patates", "Havuç", "Bulgur", "Soğan"] },
  { name: "Fırında balık ve patates", minutes: 35, cost: 105, vegetarian: false, dairyFree: true, spicy: false, ingredients: ["Balık", "Patates", "Limon", "Marul"] }
];

const form = document.querySelector("#profile-form");
const results = document.querySelector("#results");
const preferences = { vegetarian: false, dairyFree: false, spicy: false };

function readProfile() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const profile = JSON.parse(saved);
    if (profile.budget != null) document.querySelector("#budget").value = profile.budget;
    if (profile.workStart) document.querySelector("#work-start").value = profile.workStart;
    if (profile.workEnd) document.querySelector("#work-end").value = profile.workEnd;
    if (profile.mealTime != null) document.querySelector("#meal-time").value = profile.mealTime;
    if (profile.activityTime != null) document.querySelector("#activity-time").value = profile.activityTime;
    Object.keys(preferences).forEach((key) => {
      preferences[key] = Boolean(profile.preferences && profile.preferences[key]);
      setPreferenceButtons(key, preferences[key] ? "yes" : "no");
    });
    if (profile.budget != null) createPlan(profile);
  } catch (error) {
    console.error("Kaydedilmiş plan okunamadı.", error);
    window.alert("Kaydedilmiş tercihler okunamadı. Mevcut kayıt silinmedi; yeni bir plan kaydedersen üzerine yazılır.");
  }
}

function setPreferenceButtons(name, value) {
  document.querySelectorAll(`.choice[data-pref="${name}"]`).forEach((button) => {
    const selected = button.dataset.value === value;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

document.querySelectorAll(".choice").forEach((button) => {
  button.addEventListener("click", () => {
    const { pref, value } = button.dataset;
    preferences[pref] = value === "yes";
    setPreferenceButtons(pref, value);
  });
});

function getProfile() {
  return {
    budget: Number(document.querySelector("#budget").value),
    workStart: document.querySelector("#work-start").value,
    workEnd: document.querySelector("#work-end").value,
    mealTime: Number(document.querySelector("#meal-time").value),
    activityTime: Number(document.querySelector("#activity-time").value),
    preferences: { ...preferences }
  };
}

function createPlan(profile) {
  const options = meals.filter((meal) =>
    (!profile.preferences.vegetarian || meal.vegetarian) &&
    (!profile.preferences.dairyFree || meal.dairyFree) &&
    (profile.preferences.spicy || !meal.spicy) &&
    meal.minutes <= profile.mealTime
  );
  if (!options.length) {
    results.hidden = true;
    window.alert("Bu tercihlere ve yemek süresine uygun öneri bulamadım. Süreyi artırıp tekrar deneyebilirsin.");
    return;
  }

  const shuffled = [...options].sort(() => Math.random() - 0.5);
  const weeklyBudgetPerDay = profile.budget / weekdays.length;
  const selected = weekdays.map((_, day) => {
    const affordable = shuffled.filter((meal) => meal.cost <= weeklyBudgetPerDay);
    const pool = affordable.length ? affordable : shuffled;
    return pool[day % pool.length];
  });

  renderPlan(profile, selected);
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPlan(profile, selected) {
  const total = selected.reduce((sum, meal) => sum + meal.cost, 0);
  document.querySelector("#cost-summary").textContent = `${formatMoney(total)} / hafta`;
  document.querySelector("#time-summary").textContent = `${profile.mealTime} dk`;
  const budgetNote = document.querySelector("#budget-note");
  budgetNote.textContent = total > profile.budget
    ? `Akşam yemekleri tahmini bütçeni ${formatMoney(total - profile.budget)} aşıyor.`
    : `Akşam yemekleri tahmini bütçenin içinde (${formatMoney(profile.budget)}).`;

  document.querySelector("#meal-list").replaceChildren(...selected.map((meal, index) => {
    const row = document.createElement("article");
    row.className = "meal-item";
    const day = document.createElement("span");
    day.className = "day-number";
    day.textContent = String(index + 1).padStart(2, "0");
    const details = document.createElement("span");
    details.className = "meal-details";
    const title = document.createElement("strong");
    title.textContent = weekdays[index];
    const description = document.createElement("span");
    description.textContent = `${meal.name} · ${meal.minutes} dk`;
    details.append(title, description);
    const price = document.createElement("span");
    price.className = "meal-price";
    price.textContent = `~${formatMoney(meal.cost)}`;
    row.append(day, details, price);
    return row;
  }));

  const ingredientCounts = new Map();
  selected.forEach((meal) => meal.ingredients.forEach((ingredient) => {
    ingredientCounts.set(ingredient, (ingredientCounts.get(ingredient) || 0) + 1);
  }));
  const shoppingList = document.querySelector("#shopping-list");
  shoppingList.replaceChildren(...Array.from(ingredientCounts, ([ingredient, count]) => {
    const item = document.createElement("li");
    item.textContent = `${ingredient}${count > 1 ? ` · ${count} öğünde` : ""}`;
    return item;
  }));

  const activityText = profile.activityTime > 0
    ? `Günde ${profile.activityTime} dakikan varsa, bunu haftaya yay: kısa yürüyüş, evde esneme veya sevdiğin hafif bir egzersiz seç. İstersen günlere böl; kendini zorlaman gerekmez.`
    : "Bu hafta hareket için ayırdığın zaman yok. İstersen daha sonra profilinden süre ekleyip öneri alabilirsin.";
  document.querySelector("#activity-suggestion").textContent = activityText;
  document.querySelector("#work-note").textContent = `Mesai aralığın ${profile.workStart}–${profile.workEnd}; önerileri mesai dışındaki zamanlara göre düşün.`;
}

function formatMoney(value) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(value) + " ₺";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const profile = getProfile();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  createPlan(profile);
});

document.querySelector("#edit-button").addEventListener("click", () => {
  form.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#regenerate-button").addEventListener("click", () => {
  createPlan(getProfile());
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Çevrimdışı kullanım başlatılamadı.", error);
    });
  });
}

readProfile();
