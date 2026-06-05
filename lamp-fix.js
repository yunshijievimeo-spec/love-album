(function () {
  const LAMP_START_HOUR = 18;
  const LAMP_LEFT_PERSON = "\u53f7\u53f7";
  const LAMP_RIGHT_PERSON = "\u79c0\u7434";

  function isSameLocalDate(left, right) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  isLampNightOpen = function isLampNightOpen(now = new Date()) {
    return now.getHours() >= LAMP_START_HOUR;
  };

  getLampTonightRows = function getLampTonightRows(rows, now = new Date()) {
    if (!isLampNightOpen(now)) {
      return [];
    }

    return rows.filter((item) => {
      if (item.action_date !== getTodayKey()) {
        return false;
      }

      const created = new Date(item.created_at || 0);
      return isSameLocalDate(created, now) && created.getHours() >= LAMP_START_HOUR;
    });
  };

  animateLampInteraction = function animateLampInteraction() {
    if (elements.lampButton) {
      elements.lampButton.classList.remove("is-pressing");
      void elements.lampButton.offsetWidth;
      elements.lampButton.classList.add("is-pressing");
      window.setTimeout(() => elements.lampButton.classList.remove("is-pressing"), 220);
    }

    if (elements.lampScene) {
      elements.lampScene.classList.remove("is-flashing");
      void elements.lampScene.offsetWidth;
      elements.lampScene.classList.add("is-flashing");
      window.setTimeout(() => elements.lampScene.classList.remove("is-flashing"), 760);
    }
  };

  handleLampSubmit = async function handleLampSubmit() {
    const now = new Date();
    if (!isLampNightOpen(now)) {
      await hydrateLamps();
      return;
    }

    const rows = await fetchRows(tableNames.lamps, localKeys.lamps, {
      orderColumn: "created_at",
      ascending: false,
      limit: 40
    });
    const tonightRows = getLampTonightRows(rows, now);
    const mine = tonightRows.find((item) => normalizeIdentity(item.person) === state.identity);

    if (mine) {
      await hydrateLamps();
      return;
    }

    animateLampInteraction();

    await insertRow(tableNames.lamps, localKeys.lamps, {
      id: crypto.randomUUID(),
      person: state.identity,
      action_date: getTodayKey(),
      created_at: new Date().toISOString()
    });

    await hydrateLamps();
    if (typeof hydrateHeroBoard === "function") {
      await hydrateHeroBoard();
    }
  };

  hydrateLamps = async function hydrateLamps() {
    const now = new Date();
    const rows = await fetchRows(tableNames.lamps, localKeys.lamps, {
      orderColumn: "created_at",
      ascending: false,
      limit: 20
    });

    const tonightRows = getLampTonightRows(rows, now);
    const mine = tonightRows.find((item) => normalizeIdentity(item.person) === state.identity);
    const litPeople = new Set(tonightRows.map((item) => normalizeIdentity(item.person)));
    const leftOn = litPeople.has(LAMP_LEFT_PERSON);
    const rightOn = litPeople.has(LAMP_RIGHT_PERSON);
    const bothDone = leftOn && rightOn;

    if (!isLampNightOpen(now)) {
      elements.lampButton.textContent = "\u4eca\u665a18:00\u540e\u5f00\u542f";
      elements.lampButton.disabled = true;
    } else {
      elements.lampButton.textContent = mine
        ? "\u4eca\u665a\u5df2\u7ecf\u70b9\u4eae"
        : "\u70b9\u4eae\u665a\u5b89\u706f";
      elements.lampButton.disabled = Boolean(mine);
    }

    elements.lampScene.classList.toggle("is-left-on", leftOn);
    elements.lampScene.classList.toggle("is-right-on", rightOn);
    elements.lampScene.classList.toggle("is-on", bothDone);
    elements.lampScene.classList.toggle("is-off", !leftOn && !rightOn);
  };

  if (elements.lampButton) {
    const nextButton = elements.lampButton.cloneNode(true);
    elements.lampButton.replaceWith(nextButton);
    elements.lampButton = nextButton;
    elements.lampButton.addEventListener("click", handleLampSubmit);
  }

  hydrateLamps();
})();
