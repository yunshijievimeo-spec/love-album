(function () {
  const SCORE_MAX_PER_DAY = 1;

  function getScoreCardTextElement() {
    return document.querySelector(".score-card .card-text");
  }

  function getScoreSubmitButton() {
    return elements.scoreForm?.querySelector('button[type="submit"]') || null;
  }

  function getTodayScoreRowsSingle(rows, person = "") {
    const today = getTodayKey();
    return rows
      .filter((item) => item.score_date === today)
      .filter((item) => !person || normalizeIdentity(item.person) === person)
      .sort((left, right) => {
        const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
        const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();
        return rightTime - leftTime;
      });
  }

  function rememberScoreLocally(payload) {
    const rows = readJson(localKeys.scores, []);
    rows.push(payload);
    writeJson(localKeys.scores, rows);
  }

  async function saveScoreRow(payload) {
    if (!state.hasSupabase || !state.supabase) {
      rememberScoreLocally(payload);
      return;
    }

    const { error } = await state.supabase.from(tableNames.scores).insert(payload);
    if (error) {
      console.error(error);
      rememberScoreLocally(payload);
      setModeStatus("\u4eca\u65e5\u60f3\u4f60\u503c\u4e91\u7aef\u540c\u6b65\u6682\u65f6\u5931\u8d25\uff0c\u5f53\u524d\u5148\u5207\u5230\u672c\u5730\u6a21\u5f0f\u3002");
      invalidateRowsCache(tableNames.scores);
      return;
    }

    invalidateRowsCache(tableNames.scores);
  }

  syncScorePreview = function syncScorePreview() {
    elements.scorePreview.textContent = `${elements.scoreInput.value} \u5206`;
  };

  handleScoreSubmit = async function handleScoreSubmit(event) {
    event.preventDefault();

    const rows = await fetchRows(tableNames.scores, localKeys.scores, {
      orderColumn: "created_at",
      ascending: false,
      limit: 120
    });
    const mineRows = getTodayScoreRowsSingle(rows, state.identity);
    if (mineRows.length >= SCORE_MAX_PER_DAY) {
      await hydrateScores();
      return;
    }

    await saveScoreRow({
      id: crypto.randomUUID(),
      person: state.identity,
      score_date: getTodayKey(),
      score: Number(elements.scoreInput.value),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    await hydrateScores();
  };

  hydrateScores = async function hydrateScores() {
    const rows = await fetchRows(tableNames.scores, localKeys.scores, {
      orderColumn: "created_at",
      ascending: false,
      limit: 120
    });
    const todayRows = getTodayScoreRowsSingle(rows);
    const mineRows = getTodayScoreRowsSingle(rows, state.identity);
    const mine = mineRows[0] || null;
    const scoreButton = getScoreSubmitButton();
    const cardText = getScoreCardTextElement();

    if (cardText) {
      cardText.textContent = "\u7ed9\u4eca\u5929\u7684\u60f3\u5ff5\u6253\u4e2a\u5206\uff0c\u4ece 1 \u5230 100 \u90fd\u53ef\u4ee5\u3002\u6bcf\u5929\u6bcf\u4eba\u53ea\u80fd\u60f3 1 \u6b21\uff0c\u8bb0\u4e0b\u4f60\u4eca\u5929\u6700\u771f\u5b9e\u7684\u90a3\u4e00\u4efd\u60f3\u5ff5\u3002";
    }

    elements.scoreStatusBadge.textContent = mine ? "\u4eca\u5929\u5df2\u8bb0\u5f55" : "\u5f85\u586b\u5199";
    elements.scoreInput.disabled = Boolean(mine);

    if (mine) {
      elements.scoreInput.value = `${mine.score}`;
    }

    if (scoreButton) {
      scoreButton.disabled = Boolean(mine);
      scoreButton.textContent = mine ? "\u4eca\u5929\u5df2\u4fdd\u5b58" : "\u4fdd\u5b58\u5206\u6570";
    }

    syncScorePreview();

    if (!todayRows.length) {
      renderInfoPanel(
        elements.scoreSummary,
        "\u4eca\u5929\u8fd8\u6ca1\u6709\u60f3\u4f60\u503c\u3002",
        "\u6bcf\u4eba\u4eca\u5929\u53ea\u8bb0 1 \u6b21\uff0c\u6700\u9ad8 100 \u5206\u3002"
      );
      return;
    }

    const groupedRows = new Map();
    todayRows.forEach((item) => {
      const person = normalizeIdentity(item.person);
      if (!groupedRows.has(person)) {
        groupedRows.set(person, item);
      }
    });

    const wrap = document.createElement("div");
    GARDEN_PEOPLE.filter((person) => groupedRows.has(person)).forEach((person) => {
      const item = groupedRows.get(person);
      const line = document.createElement("p");
      line.innerHTML = `<strong>${person}</strong>\uff1a${Number(item.score || 0)} \u5206`;
      wrap.append(line);
    });

    const hint = document.createElement("p");
    hint.textContent = mine
      ? `\u4f60\u4eca\u5929\u5df2\u7ecf\u8bb0\u8fc7 1 \u6b21\u4e86\uff0c\u8fd9\u4efd\u60f3\u5ff5\u662f ${mine.score} \u5206\u3002`
      : "\u4f60\u4eca\u5929\u8fd8\u53ef\u4ee5\u8bb0 1 \u6b21\u3002";
    wrap.prepend(hint);

    elements.scoreSummary.innerHTML = "";
    elements.scoreSummary.append(wrap);
  };

  if (elements.scoreForm) {
    const nextForm = elements.scoreForm.cloneNode(true);
    elements.scoreForm.replaceWith(nextForm);
    elements.scoreForm = nextForm;
    elements.scoreInput = nextForm.querySelector("#scoreInput");
    elements.scorePreview = nextForm.querySelector("#scorePreview");
    elements.scoreForm.addEventListener("submit", handleScoreSubmit);
    elements.scoreInput.addEventListener("input", syncScorePreview);
  }

  if (state.refreshPromise) {
    state.refreshPromise.finally(() => hydrateScores());
  } else {
    hydrateScores();
  }
})();
