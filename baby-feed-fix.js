(function () {
  const BABY_FEED_INTERVAL_OVERRIDE_MS = 2 * 60 * 60 * 1000;
  const BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON = 4;
  const BABY_TOTAL_TARGET_OVERRIDE = 4000;
  const BABY_JUST_FED_WINDOW_MS = 18 * 60 * 1000;
  const BABY_VERY_HUNGRY_AFTER_MS = 45 * 60 * 1000;
  const BABY_HUNGRY_DELAY_RANGE = [6000, 10000];
  const BABY_VERY_HUNGRY_DELAY_RANGE = [4000, 7000];
  const BABY_VIEWER_FEED_MESSAGES = {
    "\u53f7\u53f7": ["\u8c22\u8c22\u7238\u7238", "\u9971\u9971\u5566"],
    "\u79c0\u7434": ["\u8c22\u8c22\u5988\u5988", "\u5976\u9999\u9999"]
  };
  const BABY_HUNGRY_MESSAGES = [
    "\u7238\u5988\u6211\u997f\u4e86",
    "\u54c7\u545c",
    "\u5976\u5976\u5462",
    "\u5feb\u6765\u62b1\u62b1\u6211"
  ];
  const BABY_VERY_HUNGRY_MESSAGES = [
    "\u7238\u5988\u600e\u4e48\u8fd8\u6ca1\u6765",
    "\u6211\u8981\u54ed\u54ed\u4e86",
    "\u545c\u545c\u997f\u997f",
    "\u5b9d\u5b9d\u59d4\u5c48"
  ];

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
    return BABY_VIEWER_FEED_MESSAGES[normalizeIdentity(person)] || ["\u8c22\u8c22\u4f60\u4eec", "\u9971\u9971\u5566"];
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
        heart.textContent = "\u2764";
        heart.style.left = `${anchor.heartLeft + index * 18}px`;
        heart.style.top = `${anchor.heartTop + ((index + anchorIndex) % 2) * 10}px`;
        heart.style.animationDelay = `${anchorIndex * 0.05 + index * 0.08}s`;
        elements.babyEffects.append(heart);
        removeBabyEffectLater(heart, 2200);
      }
    });
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

    if (!elements.babyEffects || stats.totalAmount >= BABY_TOTAL_TARGET) {
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

    const totalAmount = Math.min(
      BABY_TOTAL_TARGET_OVERRIDE,
      normalizedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
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

    const canFeed =
      totalAmount < BABY_TOTAL_TARGET_OVERRIDE &&
      myTodayCount < BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON &&
      (!myLastFeedAt || myCooldownRemaining <= 0);

    let scene = "is-waiting";
    let statusText = "\u7b49\u7b2c\u4e00\u987f\u5976";

    if (totalAmount >= BABY_TOTAL_TARGET_OVERRIDE) {
      scene = "is-complete";
      statusText = "\u5582\u517b\u6bd5\u4e1a";
    } else if (!lastFeedAt) {
      scene = "is-waiting";
      statusText = "\u7b49\u7b2c\u4e00\u987f\u5976";
    } else if (hungerStage === "very-hungry") {
      scene = "is-crying";
      statusText = "\u997f\u574f\u5566";
    } else if (hungerStage === "hungry") {
      scene = "is-crying";
      statusText = "\u809a\u809a\u997f\u4e86";
    } else {
      scene = "is-sleeping";
      statusText = justFed ? "\u521a\u5582\u5b8c" : "\u7761\u89c9\u4e2d";
    }

    if (bothDailyFull && cooldownRemaining > 0 && !hungerStage) {
      statusText = "\u7761\u89c9\u4e2d";
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
      justFed,
      hungerStage,
      progressPercent: (totalAmount / BABY_TOTAL_TARGET_OVERRIDE) * 100,
      remainingAmount: Math.max(0, BABY_TOTAL_TARGET_OVERRIDE - totalAmount)
    };
  };

  renderBabyFeeds = function renderBabyFeeds() {
    if (!elements.babyRoom) {
      return;
    }

    const stats = getBabyFeedStats();
    const myRemaining = Math.max(0, BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON - stats.myTodayCount);

    elements.babyRoom.className = `baby-room ${stats.scene}${stats.hungerStage === "very-hungry" ? " is-very-hungry" : ""}`;
    elements.babyStatusBadge.textContent = stats.statusText;
    elements.babyTotalAmount.textContent = `${stats.totalAmount} / ${BABY_TOTAL_TARGET_OVERRIDE}ml`;
    elements.babyHaohaoCount.textContent = `${stats.haohaoToday} / ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} \u6b21`;
    elements.babyXiuqinCount.textContent = `${stats.xiuqinToday} / ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} \u6b21`;
    elements.babyFeedState.textContent = stats.statusText;
    elements.babyProgressFill.style.width = `${stats.progressPercent}%`;

    if (stats.totalAmount >= BABY_TOTAL_TARGET_OVERRIDE) {
      elements.babyProgressHint.textContent =
        "4000ml \u5df2\u7ecf\u5582\u6ee1\u5566\uff0c\u8fd9\u5bf9\u5b9d\u5b9d\u88ab\u4f60\u4eec\u4e00\u8d77\u7a33\u7a33\u517b\u5927\u4e86\u3002";
    } else if (!stats.lastFeedAt) {
      elements.babyProgressHint.textContent =
        "\u5148\u5582\u7b2c\u4e00\u987f\u5976\u5427\uff0c\u559d\u5b8c 50ml \u540e\u5b9d\u5b9d\u4f1a\u5b89\u7a33\u7761 2 \u5c0f\u65f6\u3002";
    } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON) {
      elements.babyProgressHint.textContent =
        "\u4f60\u4eca\u5929\u5df2\u7ecf\u5582\u6ee1 3 \u6b21\u4e86\uff0c\u73b0\u5728\u8f6e\u5230\u5bf9\u65b9\u7ee7\u7eed\u7167\u987e\u5b9d\u5b9d\u3002";
    } else if (stats.myCooldownRemaining > 0) {
      elements.babyProgressHint.textContent = `\u4f60\u8fd9\u8fb9\u521a\u5582\u8fc7\uff0c\u4e0b\u4e00\u6b21\u8981\u7b49\u5230 ${formatBabyClock(
        stats.myNextFeedAt
      )} \u5de6\u53f3\u3002`;
    } else if (stats.hungerStage === "very-hungry") {
      elements.babyProgressHint.textContent = `\u8ddd\u79bb\u4e0a\u6b21\u5582\u5976\u5df2\u7ecf\u8fc7\u53bb ${formatBabyDuration(
        stats.overdueMs
      )}\uff0c\u5b9d\u5b9d\u59d4\u5c48\u5f97\u54c7\u54c7\u54ed\u4e86\uff0c\u5feb\u6765\u8865\u8fd9 50ml\u3002`;
    } else if (stats.hungerStage === "hungry") {
      elements.babyProgressHint.textContent = `\u8ddd\u79bb\u4e0a\u6b21\u5582\u5976\u5df2\u7ecf\u8fc7\u53bb ${formatBabyDuration(
        stats.overdueMs
      )}\uff0c\u5b9d\u5b9d\u997f\u4e86\uff0c\u5feb\u6765\u8865\u8fd9 50ml\u3002`;
    } else {
      elements.babyProgressHint.textContent = `\u521a\u559d\u5b8c\u5976\uff0c\u5b9d\u5b9d\u4f1a\u7761\u5230 ${formatBabyClock(
        stats.nextFeedAt
      )} \u5de6\u53f3\u3002`;
    }

    elements.babyFeedButton.disabled = !stats.canFeed;
    if (stats.totalAmount >= BABY_TOTAL_TARGET_OVERRIDE) {
      elements.babyFeedButton.textContent = "4000ml \u5df2\u517b\u6ee1";
    } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON) {
      elements.babyFeedButton.textContent = "\u4f60\u4eca\u5929\u5582\u6ee1\u4e86";
    } else if (stats.myCooldownRemaining > 0 && stats.myLastFeedAt) {
      elements.babyFeedButton.textContent = `\u8fd8\u8981\u7b49 ${formatBabyDuration(stats.myCooldownRemaining)}`;
    } else {
      elements.babyFeedButton.textContent = `\u5582 ${BABY_FEED_AMOUNT}ml \u5976`;
    }

    const syncHint =
      state.babyFeedSyncMode === "local" && state.hasSupabase
        ? "\u8fd9\u5f20\u5361\u5f53\u524d\u5148\u4fdd\u5b58\u5728\u672c\u673a\uff0c\u7b49\u4e91\u7aef\u8865\u4e0a\u5b9d\u5b9d\u5582\u517b\u8868\u540e\uff0c\u4e24\u90e8\u624b\u673a\u4e5f\u80fd\u540c\u6b65\u3002"
        : `\u4f60\u4eca\u5929\u8fd8\u53ef\u4ee5\u518d\u5582 ${myRemaining} \u6b21\uff0c\u8fd9\u5bf9\u5b9d\u5b9d\u8fd8\u5dee ${stats.remainingAmount}ml \u957f\u5927\u3002`;

    renderInfoPanel(
      elements.babySummary,
      `\u4eca\u5929\u4e00\u5171\u5582\u4e86 ${stats.todayRows.length * BABY_FEED_AMOUNT}ml\uff0c\u7d2f\u8ba1 ${stats.totalAmount} / ${BABY_TOTAL_TARGET_OVERRIDE}ml\u3002`,
      syncHint
    );

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
      ascending: true,
      limit: 160
    });

    state.babyRows = rows;
    renderBabyFeeds();
  };

  handleBabyFeed = async function handleBabyFeed() {
    const rows = state.babyRows.length
      ? state.babyRows
      : await fetchBabyFeedRows({
          orderColumn: "created_at",
          ascending: true,
          limit: 160
        });

    state.babyRows = rows;
    const stats = getBabyFeedStats(rows);
    if (!stats.canFeed) {
      renderBabyFeeds();
      return;
    }

    const nowIso = new Date().toISOString();
    await insertBabyFeedRow({
      id: crypto.randomUUID(),
      person: state.identity,
      feed_date: getTodayKey(),
      amount: BABY_FEED_AMOUNT,
      created_at: nowIso
    });

    babyJustFedShownKey = `${state.identity}:${new Date(nowIso).getTime()}`;
    clearBabyAmbientTimer();
    spawnBabyFeedAnimation(state.identity);
    await hydrateBabyFeeds();
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
  if (!state.isBooting) {
    hydrateBabyFeeds();
  }
})();
