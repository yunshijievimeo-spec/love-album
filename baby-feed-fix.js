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
      return `\u5df2\u7ecf ${BABY_GROWTH_FINAL_AGE} \u5c81\u5566`;
    }

    if (ageValue === 0.5) {
      return "\u534a\u5c81\u5566";
    }

    if (ageValue <= 0) {
      return "\u521a\u6765\u5230\u4f60\u4eec\u8eab\u8fb9";
    }

    return `${ageValue}\u5c81\u5566`;
  }

  function formatBabyAgeShort(ageValue) {
    if (ageValue >= BABY_GROWTH_FINAL_AGE) {
      return `${BABY_GROWTH_FINAL_AGE}\u5c81`;
    }

    if (ageValue === 0.5) {
      return "\u534a\u5c81";
    }

    if (ageValue <= 0) {
      return "\u65b0\u751f";
    }

    return `${ageValue}\u5c81`;
  }

  function getBabyNextMilestone(ageValue) {
    return BABY_GROWTH_MILESTONES.find((milestone) => milestone > ageValue) || null;
  }

  function getBabyInteractionLabel(ageValue) {
    if (ageValue >= 13) {
      return "\u770b\u770b\u4eca\u5929\u600e\u4e48\u6837";
    }

    if (ageValue >= 6) {
      return "\u966a\u4eca\u5929\u957f\u5927\u4e00\u70b9";
    }

    if (ageValue >= 2) {
      return "\u55b7\u996d\u996d";
    }

    return `\u5582 ${BABY_FEED_AMOUNT}ml \u5976`;
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

  function triggerBabyAgeCelebration(ageText) {
    if (!elements.babyRoom) {
      return;
    }

    elements.babyRoom.classList.add("is-celebrating");
    window.setTimeout(() => elements.babyRoom?.classList.remove("is-celebrating"), 2200);

    const anchors = getBabyAnchors();
    spawnBabyPhrase(ageText, anchors[0], "baby-thanks");
    spawnBabyPhrase(ageText, anchors[1], "baby-thanks", "0.08s");

    anchors.forEach((anchor, anchorIndex) => {
      for (let index = 0; index < 3; index += 1) {
        const heart = document.createElement("span");
        heart.className = "baby-heart-float";
        heart.textContent = "\u2764";
        heart.style.left = `${anchor.heartLeft - 8 + index * 16}px`;
        heart.style.top = `${anchor.heartTop - 10 + ((index + anchorIndex) % 2) * 8}px`;
        heart.style.animationDelay = `${anchorIndex * 0.04 + index * 0.06}s`;
        elements.babyEffects?.append(heart);
        removeBabyEffectLater(heart, 2200);
      }
    });
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

    const canFeed =
      myTodayCount < BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON && (!myLastFeedAt || myCooldownRemaining <= 0);

    let scene = "is-waiting";
    let statusText = "\u7b49\u7b2c\u4e00\u987f\u5976";
    let careStatusText = "\u7b49\u7b2c\u4e00\u987f\u5976";

    if (!lastFeedAt) {
      scene = "is-waiting";
      statusText = "\u7b49\u7b2c\u4e00\u987f\u5976";
      careStatusText = "\u4eca\u5929\u8fd8\u6ca1\u5f00\u59cb\u7167\u987e";
    } else if (hungerStage === "very-hungry") {
      scene = "is-crying";
      statusText = "\u997f\u574f\u5566";
      careStatusText = "\u5b9d\u5b9d\u997f\u5f97\u54c7\u54c7\u54ed";
    } else if (hungerStage === "hungry") {
      scene = "is-crying";
      statusText = "\u809a\u809a\u997f\u4e86";
      careStatusText = "\u5b9d\u5b9d\u5728\u7b49\u4f60\u4eec\u6765\u7167\u987e";
    } else {
      scene = "is-sleeping";
      statusText = justFed ? "\u521a\u5582\u5b8c" : "\u7761\u89c9\u4e2d";
      careStatusText = justFed ? "\u521a\u559d\u9971\u6b63\u5728\u7761\u89c9" : "\u7761\u5f97\u9999\u9999\u7684";
    }

    if (bothDailyFull && cooldownRemaining > 0 && !hungerStage) {
      statusText = "\u7761\u89c9\u4e2d";
      careStatusText = "\u4eca\u5929\u4f60\u4eec\u90fd\u7167\u987e\u6ee1\u4e86";
    } else if (myTodayCount >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON) {
      careStatusText = `\u4eca\u5929 ${state.identity} \u5df2\u7ecf\u7167\u987e\u6ee1 ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} \u6b21`;
    } else if (myCooldownRemaining > 0) {
      careStatusText = `\u8fd9\u4e00\u987f\u521a\u7167\u987e\u8fc7\uff0c${state.identity} \u8fd8\u8981\u518d\u7b49\u4e00\u4f1a`;
    } else if (lastFeedAt) {
      careStatusText = "\u4eca\u5929\u8fd8\u53ef\u4ee5\u7ee7\u7eed\u7167\u987e";
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
        "\u4f60\u4eec\u4e00\u8d77\u7167\u987e\u8fd9\u5bf9\u5b9d\u5b9d\u3002\u6bcf\u6b21\u7167\u987e 50ml\uff0c\u7167\u987e\u5b8c\u4f1a\u7761 2 \u5c0f\u65f6\uff1b4000ml \u7b97\u966a\u4ed6\u4eec\u8d70\u5230\u534a\u5c81\uff0c\u4e4b\u540e\u5c31\u6309 2.5 \u5e74\u6162\u6162\u957f\u5230 18 \u5c81\u3002\u6bcf\u4eba\u6bcf\u5929\u6700\u591a\u7167\u987e 4 \u6b21\uff0c\u60f3\u8d77\u6765\u5c31\u4e0a\u6765\u966a\u4ed6\u4eec\u4e00\u70b9\u3002";
    }
    elements.babyRoom.className = `baby-room ${stats.scene}${stats.hungerStage === "very-hungry" ? " is-very-hungry" : ""}`;
    elements.babyStatusBadge.textContent = stats.ageBadgeText;
    elements.babyTotalAmount.textContent = `${stats.totalAmount}ml`;
    elements.babyTotalAmount.previousElementSibling &&
      (elements.babyTotalAmount.previousElementSibling.textContent = "\u7d2f\u8ba1\u5976\u91cf");
    if (elements.babyCurrentAge) {
      elements.babyCurrentAge.textContent = stats.currentAgeLabel;
      elements.babyCurrentAge.previousElementSibling && (elements.babyCurrentAge.previousElementSibling.textContent = "\u5f53\u524d\u5e74\u9f84");
    }
    if (elements.babyNextAgeCountdown) {
      elements.babyNextAgeCountdown.textContent =
        stats.nextAge === null
          ? `\u5df2\u523018\u5c81`
          : `\u8fd8\u6709 ${stats.daysUntilNextAge} \u5929`;
      elements.babyNextAgeCountdown.previousElementSibling &&
        (elements.babyNextAgeCountdown.previousElementSibling.textContent = "\u8ddd\u4e0b\u4e00\u5c81");
    }
    elements.babyHaohaoCount.previousElementSibling &&
      (elements.babyHaohaoCount.previousElementSibling.textContent = "\u53f7\u53f7\u4eca\u5929");
    elements.babyXiuqinCount.previousElementSibling &&
      (elements.babyXiuqinCount.previousElementSibling.textContent = "\u79c0\u7434\u4eca\u5929");
    elements.babyHaohaoCount.textContent = `${stats.haohaoToday} / ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} \u6b21`;
    elements.babyXiuqinCount.textContent = `${stats.xiuqinToday} / ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} \u6b21`;
    elements.babyFeedState.textContent = stats.careStatusText;
    elements.babyFeedState.previousElementSibling &&
      (elements.babyFeedState.previousElementSibling.textContent = "\u4eca\u65e5\u7167\u987e\u72b6\u6001");
    elements.babyProgressFill.style.width = `${stats.progressPercent}%`;

    if (!stats.lastFeedAt) {
      elements.babyProgressHint.textContent =
        "\u5148\u5582\u7b2c\u4e00\u987f\u5976\u5427\uff0c\u559d\u5b8c 50ml \u540e\u5b9d\u5b9d\u4f1a\u5b89\u7a33\u7761 2 \u5c0f\u65f6\u3002";
    } else if (stats.reachedAge === 0.5) {
      elements.babyProgressHint.textContent =
        `4000ml \u5df2\u7ecf\u966a\u5230\u534a\u5c81\u5566\uff0c\u8ddd\u79bb ${stats.nextAge || 1} \u5c81\u8fd8\u6709 ${stats.daysUntilNextAge} \u5929\u3002`;
    } else if (stats.nextAge === null) {
      elements.babyProgressHint.textContent =
        "\u5df2\u7ecf\u957f\u5230 18 \u5c81\u5566\uff0c\u540e\u9762\u53ef\u4ee5\u518d\u7ed9\u5b69\u5b50\u5355\u72ec\u505a\u6210\u5e74\u540e\u7684\u751f\u6d3b\u6a21\u5f0f\u3002";
    } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON) {
      elements.babyProgressHint.textContent =
        `\u4f60\u4eca\u5929\u5df2\u7ecf\u7167\u987e\u6ee1 ${BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON} \u6b21\u4e86\uff0c\u73b0\u5728\u8f6e\u5230\u5bf9\u65b9\u7ee7\u7eed\u966a\u4ed6\u4eec\u957f\u5927\u3002`;
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
    if (stats.myTodayCount >= BABY_DAILY_LIMIT_OVERRIDE_PER_PERSON) {
      elements.babyFeedButton.textContent = "\u4f60\u4eca\u5929\u5582\u6ee1\u4e86";
    } else if (stats.myCooldownRemaining > 0 && stats.myLastFeedAt) {
      elements.babyFeedButton.textContent = `\u8fd8\u8981\u7b49 ${formatBabyDuration(stats.myCooldownRemaining)}`;
    } else {
      elements.babyFeedButton.textContent = getBabyInteractionLabel(stats.reachedAge);
    }

    const syncHint =
      state.babyFeedSyncMode === "local" && state.hasSupabase
        ? "\u8fd9\u5f20\u5361\u5f53\u524d\u5148\u4fdd\u5b58\u5728\u672c\u673a\uff0c\u7b49\u4e91\u7aef\u8865\u4e0a\u5b9d\u5b9d\u5582\u517b\u8868\u540e\uff0c\u4e24\u90e8\u624b\u673a\u4e5f\u80fd\u540c\u6b65\u3002"
        : stats.nextAge === null
          ? `\u4f60\u4eca\u5929\u8fd8\u53ef\u4ee5\u518d\u7167\u987e ${myRemaining} \u6b21\uff0c\u8fd9\u5bf9\u5b9d\u5b9d\u5df2\u7ecf\u8dd1\u5230\u6210\u5e74\u7ed3\u70b9\u4e86\u3002`
          : `\u4f60\u4eca\u5929\u8fd8\u53ef\u4ee5\u518d\u7167\u987e ${myRemaining} \u6b21\uff0c\u8ddd\u79bb ${stats.nextAge} \u5c81\u8fd8\u6709 ${stats.daysUntilNextAge} \u5929\u3002`;

    renderInfoPanel(
      elements.babySummary,
      `\u4eca\u5929\u4e00\u5171\u7167\u987e\u4e86 ${stats.todayRows.length * BABY_FEED_AMOUNT}ml\uff0c\u7d2f\u8ba1 ${stats.totalAmount}ml\uff0c\u73b0\u5728 ${stats.currentAgeLabel}\u3002`,
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

    state.babyRows = [
      ...rows,
      {
        person: state.identity,
        feed_date: getTodayKey(),
        amount: BABY_FEED_AMOUNT,
        created_at: nowIso
      }
    ];

    babyJustFedShownKey = `${state.identity}:${new Date(nowIso).getTime()}`;
    clearBabyAmbientTimer();
    spawnBabyFeedAnimation(state.identity);
    renderBabyFeeds();
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
  if (state.refreshPromise) {
    state.refreshPromise.finally(() => hydrateBabyFeeds());
  } else {
    hydrateBabyFeeds();
  }
})();
