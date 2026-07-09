(function () {
  const BABY_FEED_INTERVAL_MS = 2 * 60 * 60 * 1000;
  const BABY_DAILY_LIMIT_PER_PERSON = 4;
  const BABY_FEED_AMOUNT = 50;
  const BABY_HALF_YEAR_MILESTONE_AMOUNT = 4000;
  const BABY_GROWTH_TOTAL_DAYS = 913;
  const BABY_GROWTH_FINAL_AGE = 18;
  const BABY_GROWTH_MS_PER_DAY = 24 * 60 * 60 * 1000;
  const BABY_GROWTH_DAYS_PER_YEAR = BABY_GROWTH_TOTAL_DAYS / BABY_GROWTH_FINAL_AGE;
  const BABY_GROWTH_MILESTONES = [0.5, ...Array.from({ length: BABY_GROWTH_FINAL_AGE }, (_, index) => index + 1)];
  const BABY_JUST_FED_WINDOW_MS = 18 * 60 * 1000;
  const BABY_VERY_HUNGRY_AFTER_MS = 45 * 60 * 1000;
  const BABY_HUNGRY_DELAY_RANGE = [6000, 10000];
  const BABY_VERY_HUNGRY_DELAY_RANGE = [4000, 7000];
  const BABY_AGE_CELEBRATION_KEY = "love-room-baby-age-celebration-v2";
  const BABY_BASELINE_PERSON = "__baseline__";
  const BABY_BASELINE_ID = "baby-baseline-v2";
  const BABY_DEFAULT_START_AT = "2026-07-09T00:00:00+08:00";
  const BABY_RESET_START_AT = "2026-07-09T16:12:05.691+08:00";
  const BABY_VIEWER_FEED_MESSAGES = {
    号号: ["谢谢爸爸", "饱饱啦"],
    秀琴: ["谢谢妈妈", "奶香香"]
  };
  const BABY_HUNGRY_MESSAGES = ["爸妈我饿了", "肚肚咕咕了", "想找爸爸妈妈"];
  const BABY_VERY_HUNGRY_MESSAGES = ["爸妈我饿了", "我要哭哭了", "想找爸爸妈妈"];

  let babyAmbientTimer = 0;
  let babyJustFedShownKey = "";

  function clearBabyAmbientTimer() {
    if (babyAmbientTimer) {
      window.clearTimeout(babyAmbientTimer);
      babyAmbientTimer = 0;
    }
  }

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function getBabyAnchors() {
    return [
      { left: 86, top: 98, heartLeft: 104, heartTop: 132 },
      { left: 258, top: 98, heartLeft: 276, heartTop: 132 }
    ];
  }

  function removeBabyEffectLater(node, delay = 2200) {
    window.setTimeout(() => node.remove(), delay);
  }

  function spawnBabyPhrase(text, anchor, className = "baby-thanks", animationDelay = "0s") {
    if (!elements.babyEffects) {
      return;
    }

    const bubble = document.createElement("span");
    bubble.className = className;
    bubble.textContent = text;
    bubble.style.left = `${anchor.left}px`;
    bubble.style.top = `${anchor.top}px`;
    bubble.style.animationDelay = animationDelay;
    elements.babyEffects.append(bubble);
    removeBabyEffectLater(bubble, 2300);
  }

  function spawnBabyViewerThanks(person = state.identity, withHearts = true) {
    if (!elements.babyEffects) {
      return;
    }

    const normalizedPerson = normalizeIdentity(person);
    const [leftText, rightText] = BABY_VIEWER_FEED_MESSAGES[normalizedPerson] || ["谢谢你们", "饱饱啦"];
    const anchors = getBabyAnchors();

    spawnBabyPhrase(leftText, anchors[0], "baby-thanks");
    spawnBabyPhrase(rightText, anchors[1], "baby-thanks", "0.08s");

    if (!withHearts) {
      return;
    }

    anchors.forEach((anchor, anchorIndex) => {
      for (let index = 0; index < 2; index += 1) {
        const heart = document.createElement("span");
        heart.className = "baby-heart-float";
        heart.textContent = "❤";
        heart.style.left = `${anchor.heartLeft + index * 18}px`;
        heart.style.top = `${anchor.heartTop + ((index + anchorIndex) % 2) * 10}px`;
        heart.style.animationDelay = `${anchorIndex * 0.05 + index * 0.08}s`;
        elements.babyEffects.append(heart);
        removeBabyEffectLater(heart, 2200);
      }
    });
  }

  function triggerBabyAgeCelebration(ageText) {
    if (!elements.babyRoom) {
      return;
    }

    elements.babyRoom.classList.add("is-celebrating");
    window.setTimeout(() => elements.babyRoom?.classList.remove("is-celebrating"), 2200);

    const anchors = getBabyAnchors();
    spawnBabyPhrase(ageText, anchors[0], "baby-thanks");
    spawnBabyPhrase(ageText, anchors[1], "baby-thanks", "0.08s");
  }

  function spawnBabyNeedPhrases(messages, urgent = false) {
    if (!elements.babyEffects || !messages.length) {
      return;
    }

    const anchors = getBabyAnchors();
    const leftText = messages[Math.floor(Math.random() * messages.length)];
    const rightText = messages[Math.floor(Math.random() * messages.length)];
    const className = urgent ? "baby-complaint is-urgent" : "baby-complaint";

    spawnBabyPhrase(leftText, anchors[0], className);
    spawnBabyPhrase(rightText, anchors[1], className, "0.06s");
  }

  function formatDateKeyFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function getRowTimestamp(item) {
    const createdAt = item?.created_at ? new Date(item.created_at) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      return createdAt.getTime();
    }

    if (item?.feed_date) {
      const date = new Date(`${item.feed_date}T00:00:00`);
      if (!Number.isNaN(date.getTime())) {
        return date.getTime();
      }
    }

    return 0;
  }

  function getBabyRowDateKey(item) {
    const timestamp = getRowTimestamp(item);
    if (timestamp > 0) {
      return formatDateKeyFromDate(new Date(timestamp));
    }
    return item?.feed_date || "";
  }

  function sortBabyRows(rows) {
    return [...rows].sort((left, right) => getRowTimestamp(left) - getRowTimestamp(right));
  }

  function getBabyReachedAge(ageValue) {
    let reachedAge = 0;
    BABY_GROWTH_MILESTONES.forEach((milestone) => {
      if (ageValue >= milestone) {
        reachedAge = milestone;
      }
    });
    return reachedAge;
  }

  function getBabyNextMilestone(ageValue) {
    return BABY_GROWTH_MILESTONES.find((milestone) => milestone > ageValue) || null;
  }

  function formatBabyAge(ageValue) {
    if (ageValue >= BABY_GROWTH_FINAL_AGE) {
      return `已经 ${BABY_GROWTH_FINAL_AGE} 岁啦`;
    }
    if (ageValue === 0.5) {
      return "半岁啦";
    }
    if (ageValue <= 0) {
      return "刚来到你们身边";
    }
    return `${ageValue}岁啦`;
  }

  function formatBabyAgeShort(ageValue) {
    if (ageValue >= BABY_GROWTH_FINAL_AGE) {
      return `${BABY_GROWTH_FINAL_AGE}岁`;
    }
    if (ageValue === 0.5) {
      return "半岁";
    }
    if (ageValue <= 0) {
      return "新生";
    }
    return `${ageValue}岁`;
  }

  function getBabyInteractionLabel(ageValue) {
    if (ageValue >= 13) {
      return "看看今天怎么样";
    }
    if (ageValue >= 6) {
      return "陪今天长大一点";
    }
    if (ageValue >= 2) {
      return "喂一顿饭";
    }
    return `喂 ${BABY_FEED_AMOUNT}ml 奶`;
  }

  function maybeCelebrateBabyAge(stats) {
    if (!stats.reachedAge || stats.reachedAge > BABY_GROWTH_FINAL_AGE) {
      return;
    }

    const celebrationKey = formatBabyAgeShort(stats.reachedAge);
    const savedKey = localStorage.getItem(BABY_AGE_CELEBRATION_KEY);
    if (savedKey === celebrationKey) {
      return;
    }

    if (stats.reachedAge === 0.5 || Number.isInteger(stats.reachedAge)) {
      localStorage.setItem(BABY_AGE_CELEBRATION_KEY, celebrationKey);
      triggerBabyAgeCelebration(formatBabyAge(stats.reachedAge));
    }
  }

  function syncBabyAmbientPhrases(stats) {
    clearBabyAmbientTimer();

    if (!elements.babyEffects) {
      return;
    }

    if (stats.justFed) {
      const justFedKey = `${state.identity}:${stats.lastFeedAt}`;
      if (babyJustFedShownKey !== justFedKey) {
        babyJustFedShownKey = justFedKey;
        spawnBabyViewerThanks(state.identity, true);
      }
      return;
    }

    babyJustFedShownKey = "";

    if (!stats.hungerStage) {
      return;
    }

    const messages = stats.hungerStage === "very-hungry" ? BABY_VERY_HUNGRY_MESSAGES : BABY_HUNGRY_MESSAGES;
    const [minDelay, maxDelay] =
      stats.hungerStage === "very-hungry" ? BABY_VERY_HUNGRY_DELAY_RANGE : BABY_HUNGRY_DELAY_RANGE;

    const scheduleNext = () => {
      babyAmbientTimer = window.setTimeout(() => {
        spawnBabyNeedPhrases(messages, stats.hungerStage === "very-hungry");
        scheduleNext();
      }, randomBetween(minDelay, maxDelay));
    };

    scheduleNext();
  }

  function buildBabyBaselineRow() {
    return {
      id: BABY_BASELINE_ID,
      person: BABY_BASELINE_PERSON,
      feed_date: "2026-07-09",
      amount: 8000,
      created_at: BABY_DEFAULT_START_AT
    };
  }

  function getCleanBabyRows(rows = []) {
    const resetStartMs = new Date(BABY_RESET_START_AT).getTime();
    const sanitized = (Array.isArray(rows) ? rows : []).filter((item) => {
      if (!item) {
        return false;
      }

      if (item.id === BABY_BASELINE_ID || item.person === BABY_BASELINE_PERSON) {
        return false;
      }

      const person = normalizeIdentity(item.person);
      if (!GARDEN_PEOPLE.includes(person)) {
        return false;
      }

      const amount = Number(item.amount || 0);
      if (amount <= 0 || amount > BABY_FEED_AMOUNT) {
        return false;
      }

      const timestamp = getRowTimestamp(item);
      if (!timestamp || timestamp < resetStartMs) {
        return false;
      }

      return true;
    });

    return sortBabyRows([buildBabyBaselineRow(), ...sanitized]);
  }

  function getBabyGrowthStartTime(rows) {
    const baselineRow = rows.find((item) => item.id === BABY_BASELINE_ID || item.person === BABY_BASELINE_PERSON);
    if (baselineRow) {
      return getRowTimestamp(baselineRow);
    }

    const firstRealRow = rows.find((item) => GARDEN_PEOPLE.includes(normalizeIdentity(item.person)));
    return firstRealRow ? getRowTimestamp(firstRealRow) : new Date(BABY_DEFAULT_START_AT).getTime();
  }

  getBabyFeedStats = function getBabyFeedStats(rows = state.babyRows) {
    const today = getTodayKey();
    const now = Date.now();
    const normalizedRows = getCleanBabyRows(rows);
    const realRows = normalizedRows.filter((item) => item.person !== BABY_BASELINE_PERSON);
    const totalAmount = normalizedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const todayRows = realRows.filter((item) => getBabyRowDateKey(item) === today);
    const haohaoToday = todayRows.filter((item) => normalizeIdentity(item.person) === GARDEN_PEOPLE[0]).length;
    const xiuqinToday = todayRows.filter((item) => normalizeIdentity(item.person) === GARDEN_PEOPLE[1]).length;
    const myTodayCount = state.identity === GARDEN_PEOPLE[0] ? haohaoToday : xiuqinToday;
    const bothDailyFull =
      haohaoToday >= BABY_DAILY_LIMIT_PER_PERSON && xiuqinToday >= BABY_DAILY_LIMIT_PER_PERSON;

    const myRows = realRows.filter((item) => normalizeIdentity(item.person) === state.identity);
    const myLastRow = myRows[myRows.length - 1] || null;
    const myLastFeedAt = myLastRow ? getRowTimestamp(myLastRow) : 0;
    const myNextFeedAt = myLastFeedAt ? myLastFeedAt + BABY_FEED_INTERVAL_MS : 0;
    const myCooldownRemaining = myNextFeedAt ? Math.max(0, myNextFeedAt - now) : 0;

    const lastRow = realRows[realRows.length - 1] || null;
    const lastFeedAt = lastRow ? getRowTimestamp(lastRow) : 0;
    const nextFeedAt = lastFeedAt ? lastFeedAt + BABY_FEED_INTERVAL_MS : 0;
    const cooldownRemaining = nextFeedAt ? Math.max(0, nextFeedAt - now) : 0;
    const overdueMs = nextFeedAt ? Math.max(0, now - nextFeedAt) : 0;
    const justFed = lastFeedAt ? now - lastFeedAt <= BABY_JUST_FED_WINDOW_MS : false;
    const hungerStage = overdueMs <= 0 ? "" : overdueMs >= BABY_VERY_HUNGRY_AFTER_MS ? "very-hungry" : "hungry";

    const growthStartAt = getBabyGrowthStartTime(normalizedRows);
    const elapsedDays = growthStartAt ? Math.max(0, (now - growthStartAt) / BABY_GROWTH_MS_PER_DAY) : 0;
    const timelineAge = Math.min(BABY_GROWTH_FINAL_AGE, elapsedDays / BABY_GROWTH_DAYS_PER_YEAR);
    const milestoneAge = totalAmount >= BABY_HALF_YEAR_MILESTONE_AMOUNT ? 0.5 : 0;
    const effectiveAge = Math.max(timelineAge, milestoneAge);
    const reachedAge = getBabyReachedAge(effectiveAge);
    const nextAge = getBabyNextMilestone(reachedAge);
    const nextAgeAtDay = nextAge ? nextAge * BABY_GROWTH_DAYS_PER_YEAR : null;
    const daysUntilNextAge = nextAgeAtDay === null ? 0 : Math.max(0, Math.ceil(nextAgeAtDay - elapsedDays));
    const currentAgeLabel = formatBabyAgeShort(reachedAge);
    const ageBadgeText = formatBabyAge(reachedAge);
    const canFeed = myTodayCount < BABY_DAILY_LIMIT_PER_PERSON && (!myLastFeedAt || myCooldownRemaining <= 0);

    let scene = "is-waiting";
    let statusText = "等第一顿奶";
    let careStatusText = "今天还没开始照顾";

    if (!lastFeedAt) {
      scene = "is-waiting";
      statusText = "等第一顿奶";
      careStatusText = "今天还没开始照顾";
    } else if (hungerStage === "very-hungry") {
      scene = "is-crying";
      statusText = "哭哭中";
      careStatusText = "宝宝饿得哇哇哭";
    } else if (hungerStage === "hungry") {
      scene = "is-crying";
      statusText = "有点饿啦";
      careStatusText = "宝宝在等你们来照顾";
    } else {
      scene = "is-sleeping";
      statusText = justFed ? "刚喂完" : "睡觉中";
      careStatusText = justFed ? "刚喝饱正在睡觉" : "睡得香香的";
    }

    if (bothDailyFull && cooldownRemaining > 0 && !hungerStage) {
      careStatusText = "今天你们都照顾满了";
    } else if (myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
      careStatusText = `今天 ${state.identity} 已经照顾满 ${BABY_DAILY_LIMIT_PER_PERSON} 次`;
    } else if (myCooldownRemaining > 0) {
      careStatusText = `这一顿刚照顾过，${state.identity} 还要再等一会`;
    } else if (lastFeedAt) {
      careStatusText = "今天还可以继续照顾";
    }

    return {
      totalAmount,
      todayRows,
      haohaoToday,
      xiuqinToday,
      myRows,
      myTodayCount,
      bothDailyFull,
      myLastFeedAt,
      myNextFeedAt,
      myCooldownRemaining,
      lastFeedAt,
      nextFeedAt,
      cooldownRemaining,
      overdueMs,
      canFeed,
      scene,
      statusText,
      careStatusText,
      justFed,
      hungerStage,
      growthStartAt,
      elapsedDays,
      reachedAge,
      nextAge,
      daysUntilNextAge,
      currentAgeLabel,
      ageBadgeText,
      progressPercent:
        nextAge === null
          ? 100
          : Math.max(
              0,
              Math.min(
                100,
                ((elapsedDays - reachedAge * BABY_GROWTH_DAYS_PER_YEAR) /
                  ((nextAge - reachedAge) * BABY_GROWTH_DAYS_PER_YEAR || 1)) *
                  100
              )
            )
    };
  };

  renderBabyFeeds = function renderBabyFeeds() {
    if (!elements.babyRoom) {
      return;
    }

    const stats = getBabyFeedStats();
    const myRemaining = Math.max(0, BABY_DAILY_LIMIT_PER_PERSON - stats.myTodayCount);

    if (elements.babyCardText) {
      elements.babyCardText.textContent =
        "你们一起照顾这对宝宝。每次喂 50ml，喂完会睡 2 小时。4000ml 算陪到半岁，之后按 2.5 年慢慢长到 18 岁。每人每天最多照顾 4 次。";
    }

    elements.babyRoom.className = `baby-room ${stats.scene}${stats.hungerStage === "very-hungry" ? " is-very-hungry" : ""}`;
    elements.babyStatusBadge.textContent = stats.ageBadgeText;
    elements.babyTotalAmount.textContent = `${stats.totalAmount}ml`;
    if (elements.babyCurrentAge) {
      elements.babyCurrentAge.textContent = stats.currentAgeLabel;
    }
    if (elements.babyNextAgeCountdown) {
      elements.babyNextAgeCountdown.textContent = stats.nextAge === null ? "已到18岁" : `还有 ${stats.daysUntilNextAge} 天`;
    }
    elements.babyHaohaoCount.textContent = `${stats.haohaoToday} / ${BABY_DAILY_LIMIT_PER_PERSON} 次`;
    elements.babyXiuqinCount.textContent = `${stats.xiuqinToday} / ${BABY_DAILY_LIMIT_PER_PERSON} 次`;
    elements.babyFeedState.textContent = stats.careStatusText;
    elements.babyProgressFill.style.width = `${stats.progressPercent}%`;

    if (!stats.lastFeedAt) {
      elements.babyProgressHint.textContent = "先喂第一顿奶吧，喝完 50ml 后宝宝会安稳睡 2 小时。";
    } else if (stats.reachedAge === 0.5) {
      elements.babyProgressHint.textContent = `4000ml 已经陪到半岁啦，距离 ${stats.nextAge || 1} 岁还有 ${stats.daysUntilNextAge} 天。`;
    } else if (stats.nextAge === null) {
      elements.babyProgressHint.textContent = "已经长到 18 岁啦。";
    } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
      elements.babyProgressHint.textContent = `你今天已经照顾满 ${BABY_DAILY_LIMIT_PER_PERSON} 次了，现在轮到对方继续陪他们长大。`;
    } else if (stats.myCooldownRemaining > 0) {
      elements.babyProgressHint.textContent = `你这边刚喂过，下一次要等到 ${formatBabyClock(stats.myNextFeedAt)} 左右。`;
    } else if (stats.hungerStage === "very-hungry") {
      elements.babyProgressHint.textContent = `距离上次喂奶已经过去 ${formatBabyDuration(stats.overdueMs)}，宝宝委屈得哇哇哭了，快来补这 50ml。`;
    } else if (stats.hungerStage === "hungry") {
      elements.babyProgressHint.textContent = `距离上次喂奶已经过去 ${formatBabyDuration(stats.overdueMs)}，宝宝饿了，快来补这 50ml。`;
    } else {
      elements.babyProgressHint.textContent = `刚喝完奶，宝宝会睡到 ${formatBabyClock(stats.nextFeedAt)} 左右。`;
    }

    elements.babyFeedButton.disabled = !stats.canFeed;
    if (stats.myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
      elements.babyFeedButton.textContent = "你今天喂满了";
    } else if (stats.myCooldownRemaining > 0 && stats.myLastFeedAt) {
      elements.babyFeedButton.textContent = `还要等 ${formatBabyDuration(stats.myCooldownRemaining)}`;
    } else {
      elements.babyFeedButton.textContent = getBabyInteractionLabel(stats.reachedAge);
    }

    const syncHint =
      state.babyFeedSyncMode === "local" && state.hasSupabase
        ? "这张卡当前先保存在本机，等云端补上宝宝喂养表后，两部手机也能同步。"
        : stats.nextAge === null
          ? `你今天还可以再照顾 ${myRemaining} 次，这对宝宝已经长大啦。`
          : `你今天还可以再照顾 ${myRemaining} 次，距离 ${stats.nextAge} 岁还有 ${stats.daysUntilNextAge} 天。`;

    renderInfoPanel(
      elements.babySummary,
      `今天一共照顾了 ${stats.todayRows.length * BABY_FEED_AMOUNT}ml，累计 ${stats.totalAmount}ml，现在 ${stats.currentAgeLabel}。`,
      syncHint
    );

    maybeCelebrateBabyAge(stats);
    syncBabyAmbientPhrases(stats);
  };

  spawnBabyFeedAnimation = function spawnBabyFeedAnimation(person = state.identity) {
    spawnBabyViewerThanks(person, true);
  };

  hydrateBabyFeeds = async function hydrateBabyFeeds() {
    if (!elements.babyRoom) {
      return;
    }

    const rows = await fetchBabyFeedRows({
      orderColumn: "created_at",
      ascending: true
    });

    state.babyRows = getCleanBabyRows(rows);
    renderBabyFeeds();
  };

  handleBabyFeed = async function handleBabyFeed() {
    const rows = state.babyRows.length
      ? state.babyRows
      : getCleanBabyRows(
          await fetchBabyFeedRows({
            orderColumn: "created_at",
            ascending: true
          })
        );

    state.babyRows = rows;
    const stats = getBabyFeedStats(rows);
    if (!stats.canFeed) {
      renderBabyFeeds();
      return;
    }

    const nowIso = new Date().toISOString();
    const payload = {
      id: crypto.randomUUID(),
      person: state.identity,
      feed_date: getTodayKey(),
      amount: BABY_FEED_AMOUNT,
      created_at: nowIso
    };

    const insertResult = await insertBabyFeedRow(payload);

    babyJustFedShownKey = `${state.identity}:${new Date(nowIso).getTime()}`;
    clearBabyAmbientTimer();
    spawnBabyFeedAnimation(state.identity);

    if (insertResult?.mode === "cloud") {
      await hydrateBabyFeeds();
    } else {
      state.babyRows = getCleanBabyRows([...rows, payload]);
      renderBabyFeeds();
    }

    if (typeof hydrateHeroBoard === "function") {
      await hydrateHeroBoard();
    }
  };

  if (elements.babyFeedButton) {
    const nextButton = elements.babyFeedButton.cloneNode(true);
    elements.babyFeedButton.replaceWith(nextButton);
    elements.babyFeedButton = nextButton;
    elements.babyFeedButton.addEventListener("click", handleBabyFeed);
  }

  window.addEventListener("beforeunload", clearBabyAmbientTimer);
  if (state.refreshPromise) {
    state.refreshPromise.finally(() => hydrateBabyFeeds());
  } else {
    hydrateBabyFeeds();
  }
})();
