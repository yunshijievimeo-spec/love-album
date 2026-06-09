(function () {
  const LAMP_START_HOUR = 20;
  const LAMP_LEFT_PERSON = "\u53f7\u53f7";
  const LAMP_RIGHT_PERSON = "\u79c0\u7434";
  const lampStatusText = document.querySelector("#lampStatusText");

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
    const otherPerson = state.identity === LAMP_LEFT_PERSON ? LAMP_RIGHT_PERSON : LAMP_LEFT_PERSON;
    const otherDone = litPeople.has(otherPerson);

    if (!isLampNightOpen(now)) {
      elements.lampButton.textContent = "\u4eca\u665a20:00\u540e\u5f00\u542f";
      elements.lampButton.disabled = true;
      if (lampStatusText) {
        lampStatusText.textContent = "\u767d\u5929\u5148\u4e00\u8d77\u52aa\u529b\uff0c\u4eca\u665a 20:00 \u540e\u518d\u6765\u4e00\u8d77\u5173\u706f\u7761\u89c9\u3002";
      }
    } else if (bothDone) {
      elements.lampButton.textContent = "\u4eca\u665a\u4e00\u8d77\u5173\u706f\u5566";
      elements.lampButton.disabled = true;
      if (lampStatusText) {
        lampStatusText.textContent = "\u5e8a\u5934\u706f\u5df2\u7ecf\u5173\u6389\u4e86\uff0c\u661f\u661f\u548c\u6708\u4eae\u6765\u966a\u4f60\u4eec\u4e00\u8d77\u7761\u3002";
      }
    } else if (mine) {
      elements.lampButton.textContent = "\u7b49\u5bf9\u65b9\u4e00\u8d77\u5173\u706f";
      elements.lampButton.disabled = true;
      if (lampStatusText) {
        lampStatusText.textContent = `${state.identity}\u5df2\u7ecf\u51c6\u5907\u7761\u5566\uff0c\u7b49${otherPerson}\u4e00\u8d77\u628a\u706f\u5173\u6389\u3002`;
      }
    } else {
      elements.lampButton.textContent = "\u51c6\u5907\u7761\u5566";
      elements.lampButton.disabled = false;
      if (lampStatusText) {
        lampStatusText.textContent = otherDone
          ? `${otherPerson}\u5df2\u7ecf\u4e0a\u5e8a\u4e86\uff0c\u5c31\u5dee\u4f60\u4e00\u8d77\u628a\u706f\u5173\u6389\u3002`
          : "\u665a\u4e0a\u597d\uff0c\u4e00\u4eba\u70b9\u4e00\u6b21\u51c6\u5907\u7761\u5566\uff0c\u4e24\u4e2a\u4eba\u90fd\u70b9\u5b8c\u5c31\u4f1a\u5207\u6210\u661f\u7a7a\u3002";
      }
    }

    elements.lampScene.classList.toggle("is-day", !isLampNightOpen(now));
    elements.lampScene.classList.toggle("is-night", isLampNightOpen(now));
    elements.lampScene.classList.toggle("is-left-on", leftOn);
    elements.lampScene.classList.toggle("is-right-on", rightOn);
    elements.lampScene.classList.toggle("is-on", bothDone);
    elements.lampScene.classList.toggle("is-off", !isLampNightOpen(now) && !leftOn && !rightOn);
  };

  if (elements.lampButton) {
    const nextButton = elements.lampButton.cloneNode(true);
    elements.lampButton.replaceWith(nextButton);
    elements.lampButton = nextButton;
    elements.lampButton.addEventListener("click", handleLampSubmit);
  }

  if (state.refreshPromise) {
    state.refreshPromise.finally(() => hydrateLamps());
  } else {
    hydrateLamps();
  }
})();
