(function () {
  const BABY_FEED_INTERVAL_OVERRIDE_MS = 2 * 60 * 60 * 1000;
  const BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON = 4;
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
  const BABY_AGE_CELEBRATION_KEY = "love-room-baby-age-celebration";
  const BABY_VIEWER_FEED_MESSAGES = {
    "号号": ["谢谢爸爸", "饱饱啦"],
    "秀琴": ["谢谢妈妈", "奶香香"]
  };
  const BABY_HUNGRY_MESSAGES = ["爸妈我饿了", "哇呜", "奶奶呢", "快来抱抱我"];
  const BABY_VERY_HUNGRY_MESSAGES = ["爸妈怎么还没来", "我要哭哭了", "呜呜饿饿", "宝宝委屈"];

  let babyAmbientTimer = 0;
  let babyJustFedShownKey = "";

  function normalizePersonRows(rows, person) {
    return rows.filter((item) => normalizeIdentity(item.person) === person);
  }

  function randomBetween(min, max) {
    return Math.round(min + Math.random() * (max - min));
  }

  function clearBabyAmbientTimer() {
    if (babyAmbientTimer) {
      window.clearTimeout(babyAmbientTimer);
      babyAmbientTimer = 0;
    }
  }

  function getBabyAnchors() {
    return [
      { left: 86, top: 98, heartLeft: 104, heartTop: 132 },
      { left: 258, top: 98, heartLeft: 276, heartTop: 132 }
    ];
  }

  function getViewerFeedMessages(person = state.identity) {
    return BABY_VIEWER_FEED_MESSAGES[normalizeIdentity(person)] || ["谢谢你们", "饱饱啦"];
  }

  function getBabyGrowthStartTime(rows) {
    const firstRow = rows.find((item) => item.created_at);
    return firstRow ? new Date(firstRow.created_at).getTime() : 0;
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

  function getBabyNextMilestone(ageValue) {
    return BABY_GROWTH_MILESTONES.find((milestone) => milestone > ageValue) || null;
  }

  function getBabyInteractionLabel(ageValue) {
    if (ageValue >= 13) {
      return "看看今天怎么样";
    }

    if (ageValue >= 6) {
      return "陪今天长大一点";
    }

    if (ageValue >= 2) {
      return "喂饭饭";
    }

    return `喂 ${BABY_FEED_AMOUNT}ml 奶`;
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

    const [leftText, rightText] = getViewerFeedMessages(person);
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

  getBabyFeedStats = function getBabyFeedStats(rows = state.babyRows) {
    const today = getTodayKey();
    const now = Date.now();
    const normalizedRows = [...rows].sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return leftTime - rightTime;
    });

    const totalAmount = normalizedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const todayRows = normalizedRows.filter((item) => item.feed_date === today);
    const haohaoToday = normalizePersonRows(todayRows, GARDEN_PEOPLE[0]).length;
    const xiuqinToday = normalizePersonRows(todayRows, GARDEN_PEOPLE[1]).length;
    const myTodayCount = state.identity === GARDEN_PEOPLE[0] ? haohaoToday : xiuqinToday;
    const bothDailyFull =
      haohaoToday >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON && xiuqinToday >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON;

    const myRows = normalizePersonRows(normalizedRows, state.identity);
    const myLastRow = myRows[myRows.length - 1] || null;
    const myLastFeedAt = myLastRow ? new Date(myLastRow.created_at || 0).getTime() : 0;
    const myNextFeedAt = myLastFeedAt ? myLastFeedAt + BABY_FEED_INTERVAL_OVERRIDE_MS : 0;
    const myCooldownRemaining = myNextFeedAt ? Math.max(0, myNextFeedAt - now) : 0;

    const lastRow = normalizedRows[normalizedRows.length - 1] || null;
    const lastFeedAt = lastRow ? new Date(lastRow.created_at || 0).getTime() : 0;
    const nextFeedAt = lastFeedAt ? lastFeedAt + BABY_FEED_INTERVAL_OVERRIDE_MS : 0;
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

    const canFeed = myTodayCount < BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON && (!myLastFeedAt || myCooldownRemaining <= 0);

    let scene = "is-waiting";
    let statusText = "等第一顿奶";
    let careStatusText = "等第一顿奶";

    if (!lastFeedAt) {
      scene = "is-waiting";
      statusText = "等第一顿奶";
      careStatusText = "今天还没开始照顾";
    } else if (hungerStage === "very-hungry") {
      scene = "is-crying";
      statusText = "饿坏啦";
      careStatusText = "宝宝饿得哇哇哭";
    } else if (hungerStage === "hungry") {
      scene = "is-crying";
      statusText = "肚肚饿了";
      careStatusText = "宝宝在等你们来照顾";
    } else {
      scene = "is-sleeping";
      statusText = justFed ? "刚喂完" : "睡觉中";
      careStatusText = justFed ? "刚喝饱正在睡觉" : "睡得香香的";
    }

    if (bothDailyFull && cooldownRemaining > 0 && !hungerStage) {
      statusText = "睡觉中";
      careStatusText = "今天你们都照顾满了";
    } else if (myTodayCount >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON) {
      careStatusText = `今天 ${state.identity} 已经照顾满 ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} 次`;
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
      timelineAge,
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
    const myRemaining = Math.max(0, BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON - stats.myTodayCount);

    if (elements.babyCardText) {
      elements.babyCardText.textContent =
        "你们一起照顾这对宝宝。每次照顾 50ml，照顾完会睡 2 小时；4000ml 算陪他们走到半岁，之后就按 2.5 年慢慢长到 18 岁。每人每天最多照顾 4 次，想起来就上来陪他们一点。";
    }
    elements.babyRoom.className = `baby-room ${stats.scene}${stats.hungerStage === "very-hungry" ? " is-very-hungry" : ""}`;
    elements.babyStatusBadge.textContent = stats.ageBadgeText;
    elements.babyTotalAmount.textContent = `${stats.totalAmount}ml`;
    if (elements.babyTotalAmount.previousElementSibling) {
      elements.babyTotalAmount.previousElementSibling.textContent = "累计奶量";
    }
    if (elements.babyCurrentAge) {
      elements.babyCurrentAge.textContent = stats.currentAgeLabel;
      if (elements.babyCurrentAge.previousElementSibling) {
        elements.babyCurrentAge.previousElementSibling.textContent = "当前年龄";
      }
    }
    if (elements.babyNextAgeCountdown) {
      elements.babyNextAgeCountdown.textContent = stats.nextAge === null ? "已到18岁" : `还有 ${stats.daysUntilNextAge} 天`;
      if (elements.babyNextAgeCountdown.previousElementSibling) {
        elements.babyNextAgeCountdown.previousElementSibling.textContent = "距下一岁";
      }
    }
    if (elements.babyHaohaoCount.previousElementSibling) {
      elements.babyHaohaoCount.previousElementSibling.textContent = "号号今天";
    }
    if (elements.babyXiuqinCount.previousElementSibling) {
      elements.babyXiuqinCount.previousElementSibling.textContent = "秀琴今天";
    }
    elements.babyHaohaoCount.textContent = `${stats.haohaoToday} / ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} 次`;
    elements.babyXiuqinCount.textContent = `${stats.xiuqinToday} / ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} 次`;
    elements.babyFeedState.textContent = stats.careStatusText;
    if (elements.babyFeedState.previousElementSibling) {
      elements.babyFeedState.previousElementSibling.textContent = "今日照顾状态";
    }
    elements.babyProgressFill.style.width = `${stats.progressPercent}%`;

    if (!stats.lastFeedAt) {
      elements.babyProgressHint.textContent = "先喂第一顿奶吧，喝完 50ml 后宝宝会安稳睡 2 小时。";
    } else if (stats.reachedAge === 0.5) {
      elements.babyProgressHint.textContent = `4000ml 已经陪到半岁啦，距离 ${stats.nextAge || 1} 岁还有 ${stats.daysUntilNextAge} 天。`;
    } else if (stats.nextAge === null) {
      elements.babyProgressHint.textContent = "已经长到 18 岁啦，后面可以再给孩子单独做成年后的生活模式。";
    } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON) {
      elements.babyProgressHint.textContent = `你今天已经照顾满 ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} 次了，现在轮到对方继续陪他们长大。`;
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
    if (stats.myTodayCount >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON) {
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
          ? `你今天还可以再照顾 ${myRemaining} 次，这对宝宝已经跑到成年终点了。`
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

    state.babyRows = rows;
    renderBabyFeeds();
  };

  handleBabyFeed = async function handleBabyFeed() {
    const rows = state.babyRows.length
      ? state.babyRows
      : await fetchBabyFeedRows({
          orderColumn: "created_at",
          ascending: true
        });

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
      state.babyRows = [...rows, payload].sort((left, right) => {
        const leftTime = new Date(left.created_at || 0).getTime();
        const rightTime = new Date(right.created_at || 0).getTime();
        return leftTime - rightTime;
      });
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
