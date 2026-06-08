(function () {
  const board = {
    stamp: document.querySelector("#heroBoardStamp"),
    babyCount: document.querySelector("#heroBoardBabyCount"),
    waterCount: document.querySelector("#heroBoardWaterCount"),
    capsuleCount: document.querySelector("#heroBoardCapsuleCount"),
    hugCount: document.querySelector("#heroBoardHugCount"),
    list: document.querySelector("#heroBoardList")
  };

  function formatBoardTime(value) {
    if (!value) {
      return "--:--";
    }

    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function buildBoardItem(text, time) {
    return {
      text,
      ts: new Date(time || 0).getTime() || 0
    };
  }

  window.hydrateHeroBoard = async function hydrateHeroBoard() {
    if (!board.list) {
      return;
    }

    const today = getTodayKey();
    const [hugRows, capsuleRows, gardenRows, babyRows] = await Promise.all([
      fetchRows(tableNames.hugs, localKeys.hugs, {
        orderColumn: "created_at",
        ascending: false,
        limit: 12
      }),
      fetchRows(tableNames.capsules, localKeys.capsules, {
        orderColumn: "created_at",
        ascending: false,
        limit: 12
      }),
      state.gardenRows.length
        ? Promise.resolve(state.gardenRows)
        : fetchRows(tableNames.gardenWatering, localKeys.gardenWatering, {
            orderColumn: "created_at",
            ascending: false,
            limit: 20
          }),
      state.babyRows.length
        ? Promise.resolve(state.babyRows)
        : fetchBabyFeedRows({
            orderColumn: "created_at",
            ascending: false,
            limit: 20
          })
    ]);

    const todayHugs = hugRows.filter((item) => item.action_date === today);
    const todayCapsules = capsuleRows.filter((item) => String(item.created_at || "").slice(0, 10) === today);
    const todayGarden = gardenRows.filter((item) => item.water_date === today);
    const todayBaby = babyRows.filter((item) => item.feed_date === today);

    board.babyCount.textContent = `${todayBaby.length} 次`;
    board.waterCount.textContent = `${todayGarden.reduce((sum, item) => sum + Number(item.count || 0), 0)} 点`;
    board.capsuleCount.textContent = `${todayCapsules.length} 条`;
    board.hugCount.textContent = `${todayHugs.length} 次`;

    const items = [
      ...todayBaby.map((item) =>
        buildBoardItem(`${normalizeIdentity(item.person)}喂了宝宝 ${item.amount || BABY_FEED_AMOUNT}ml 奶`, item.created_at)
      ),
      ...todayGarden.map((item) =>
        buildBoardItem(`${normalizeIdentity(item.person)}给果子浇了 ${Number(item.count || 0)} 点水`, item.created_at)
      ),
      ...todayHugs.map((item) => buildBoardItem(`${normalizeIdentity(item.person)}来抱抱了`, item.created_at)),
      ...todayCapsules.map((item) => {
        const content = String(item.content || "").trim();
        const preview = content.length > 16 ? `${content.slice(0, 16)}...` : content || "留下一句悄悄话";
        return buildBoardItem(`${normalizeIdentity(item.person)}留了小纸条：${preview}`, item.created_at);
      })
    ]
      .sort((left, right) => right.ts - left.ts)
      .slice(0, 6);

    board.stamp.textContent = items[0] ? `最近更新 ${formatBoardTime(items[0].ts)}` : "今天还没有新动态";
    board.list.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "hero-board-empty";
      empty.textContent = "今天还没有新动态，等你们来点亮第一条。";
      board.list.append(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement("article");
      row.className = "hero-board-item";

      const text = document.createElement("p");
      text.textContent = item.text;

      const time = document.createElement("time");
      time.textContent = formatBoardTime(item.ts);

      row.append(text, time);
      board.list.append(row);
    });
  };
})();
