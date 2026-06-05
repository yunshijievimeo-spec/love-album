(function () {
  function normalizePersonRows(rows, person) {
    return rows.filter((item) => normalizeIdentity(item.person) === person);
  }

  getBabyFeedStats = function getBabyFeedStats(rows = state.babyRows) {
    const today = getTodayKey();
    const normalizedRows = [...rows].sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return leftTime - rightTime;
    });

    const totalAmount = Math.min(
      BABY_TOTAL_TARGET,
      normalizedRows.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
    const todayRows = normalizedRows.filter((item) => item.feed_date === today);
    const haohaoToday = normalizePersonRows(todayRows, GARDEN_PEOPLE[0]).length;
    const xiuqinToday = normalizePersonRows(todayRows, GARDEN_PEOPLE[1]).length;
    const myTodayCount = state.identity === GARDEN_PEOPLE[0] ? haohaoToday : xiuqinToday;
    const bothDailyFull = haohaoToday >= BABY_DAILY_LIMIT_PER_PERSON && xiuqinToday >= BABY_DAILY_LIMIT_PER_PERSON;

    const myRows = normalizePersonRows(normalizedRows, state.identity);
    const myLastRow = myRows[myRows.length - 1] || null;
    const myLastFeedAt = myLastRow ? new Date(myLastRow.created_at || 0).getTime() : 0;
    const myNextFeedAt = myLastFeedAt ? myLastFeedAt + BABY_FEED_INTERVAL_MS : 0;
    const myCooldownRemaining = myNextFeedAt ? Math.max(0, myNextFeedAt - Date.now()) : 0;

    const lastRow = normalizedRows[normalizedRows.length - 1] || null;
    const lastFeedAt = lastRow ? new Date(lastRow.created_at || 0).getTime() : 0;
    const nextFeedAt = lastFeedAt ? lastFeedAt + BABY_FEED_INTERVAL_MS : 0;
    const cooldownRemaining = nextFeedAt ? Math.max(0, nextFeedAt - Date.now()) : 0;
    const overdueMs = nextFeedAt ? Math.max(0, Date.now() - nextFeedAt) : 0;

    const canFeed =
      totalAmount < BABY_TOTAL_TARGET &&
      myTodayCount < BABY_DAILY_LIMIT_PER_PERSON &&
      (!myLastFeedAt || myCooldownRemaining <= 0);

    let scene = "is-waiting";
    let statusText = "等第一顿奶";

    if (totalAmount >= BABY_TOTAL_TARGET) {
      scene = "is-complete";
      statusText = "喂养毕业";
    } else if (!lastFeedAt) {
      scene = "is-waiting";
      statusText = "等第一顿奶";
    } else if (cooldownRemaining > 0 || bothDailyFull) {
      scene = "is-sleeping";
      statusText = "睡觉中";
    } else {
      scene = "is-crying";
      statusText = "哭哭中";
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
      progressPercent: (totalAmount / BABY_TOTAL_TARGET) * 100,
      remainingAmount: Math.max(0, BABY_TOTAL_TARGET - totalAmount)
    };
  };

  renderBabyFeeds = function renderBabyFeeds() {
    if (!elements.babyRoom) {
      return;
    }

    const stats = getBabyFeedStats();
    const myRemaining = Math.max(0, BABY_DAILY_LIMIT_PER_PERSON - stats.myTodayCount);

    elements.babyRoom.className = `baby-room ${stats.scene}`;
    elements.babyStatusBadge.textContent = stats.statusText;
    elements.babyTotalAmount.textContent = `${stats.totalAmount} / ${BABY_TOTAL_TARGET}ml`;
    elements.babyHaohaoCount.textContent = `${stats.haohaoToday} / ${BABY_DAILY_LIMIT_PER_PERSON} 次`;
    elements.babyXiuqinCount.textContent = `${stats.xiuqinToday} / ${BABY_DAILY_LIMIT_PER_PERSON} 次`;
    elements.babyFeedState.textContent = stats.statusText;
    elements.babyProgressFill.style.width = `${stats.progressPercent}%`;

    if (stats.totalAmount >= BABY_TOTAL_TARGET) {
      elements.babyProgressHint.textContent = "3000ml 已经喂满啦，这对宝宝被你们一起稳稳养大了。";
    } else if (!stats.lastFeedAt) {
      elements.babyProgressHint.textContent = "先喂第一顿奶吧，喝完 50ml 后宝宝会安稳睡 3 小时。";
    } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
      elements.babyProgressHint.textContent = "你今天已经喂满 3 次了，现在轮到对方继续照顾宝宝。";
    } else if (stats.myCooldownRemaining > 0) {
      elements.babyProgressHint.textContent = `你这边刚喂过，下一次要等到 ${formatBabyClock(stats.myNextFeedAt)} 左右。`;
    } else if (stats.cooldownRemaining > 0) {
      elements.babyProgressHint.textContent = "宝宝刚喝完还在睡，但你这边已经可以补一顿 50ml。";
    } else {
      elements.babyProgressHint.textContent = `距离上次喂奶已经过去 ${formatBabyDuration(stats.overdueMs)}，宝宝在哭，快来补这 50ml。`;
    }

    elements.babyFeedButton.disabled = !stats.canFeed;
    if (stats.totalAmount >= BABY_TOTAL_TARGET) {
      elements.babyFeedButton.textContent = "3000ml 已养满";
    } else if (stats.myTodayCount >= BABY_DAILY_LIMIT_PER_PERSON) {
      elements.babyFeedButton.textContent = "你今天喂满了";
    } else if (stats.myCooldownRemaining > 0 && stats.myLastFeedAt) {
      elements.babyFeedButton.textContent = `还要等 ${formatBabyDuration(stats.myCooldownRemaining)}`;
    } else {
      elements.babyFeedButton.textContent = `喂 ${BABY_FEED_AMOUNT}ml 奶`;
    }

    const syncHint =
      state.babyFeedSyncMode === "local" && state.hasSupabase
        ? "这张卡当前先保存在本机，等云端补上宝宝喂养表后，两部手机也能同步。"
        : `你今天还可以再喂 ${myRemaining} 次，这对宝宝还差 ${stats.remainingAmount}ml 长大。`;

    renderInfoPanel(
      elements.babySummary,
      `今天一共喂了 ${stats.todayRows.length * BABY_FEED_AMOUNT}ml，累计 ${stats.totalAmount} / ${BABY_TOTAL_TARGET}ml。`,
      syncHint
    );
  };

  spawnBabyFeedAnimation = function spawnBabyFeedAnimation(person = state.identity) {
    if (!elements.babyEffects) {
      return;
    }

    const message = person === GARDEN_PEOPLE[0] ? "谢谢爸爸" : "谢谢妈妈";
    const anchors = [
      { left: 86, top: 98, heartLeft: 104, heartTop: 132 },
      { left: 258, top: 98, heartLeft: 276, heartTop: 132 }
    ];

    anchors.forEach((anchor) => {
      const thanks = document.createElement("span");
      thanks.className = "baby-thanks";
      thanks.textContent = message;
      thanks.style.left = `${anchor.left}px`;
      thanks.style.top = `${anchor.top}px`;
      elements.babyEffects.append(thanks);

      for (let index = 0; index < 3; index += 1) {
        const heart = document.createElement("span");
        heart.className = "baby-heart-float";
        heart.textContent = "❤";
        heart.style.left = `${anchor.heartLeft + index * 16}px`;
        heart.style.top = `${anchor.heartTop + (index % 2) * 10}px`;
        heart.style.animationDelay = `${index * 0.08}s`;
        elements.babyEffects.append(heart);
        window.setTimeout(() => heart.remove(), 2100);
      }

      window.setTimeout(() => thanks.remove(), 2100);
    });
  };

  handleBabyFeed = async function handleBabyFeed() {
    const rows = state.babyRows.length
      ? state.babyRows
      : await fetchBabyFeedRows({
          orderColumn: "created_at",
          ascending: true,
          limit: 500
        });

    state.babyRows = rows;
    const stats = getBabyFeedStats(rows);
    if (!stats.canFeed) {
      renderBabyFeeds();
      return;
    }

    await insertBabyFeedRow({
      id: crypto.randomUUID(),
      person: state.identity,
      feed_date: getTodayKey(),
      amount: BABY_FEED_AMOUNT,
      created_at: new Date().toISOString()
    });

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

  hydrateBabyFeeds();
})();
