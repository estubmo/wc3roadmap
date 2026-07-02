// SPDX-License-Identifier: GPL-3.0-or-later
// Vendored from jblanchette/wc3v (GPL-3.0) at commit 87edeef1f77a8c6f9896b8844990f5b74f6313a0.
// Source: https://github.com/jblanchette/wc3v
// Copyright (C) original wc3v contributors (Jeff Blanchette et al.)
// See src/lib/wc3v/README.md for scope, provenance, and integration notes,
// and docs/adr/012-wc3v-fork-integration.md for the integration decision.
// PATCHED (08-13 GO decision): w3gjs internal-path references repointed from
// the upstream 3.0.0-era `dist/lib/...` layout to the installed 4.1.0
// `dist/cjs/...` layout where this file required it -- see inline comments.

const utils = require("../helpers/utils");

const EventTimer = class {
  constructor () {
    this.timer = {
      gameTime: 0,
      lastGameTime: 0,
      delta: 0
    };

    this.events = [];
  }

  addEvent (runLength, onTick, onComplete) {
    const startTime = this.timer.gameTime;

    const eventItem = {
      uuid: utils.uuidv4(),
      startTime: startTime,
      endTime: startTime + runLength,
      runLength: runLength,
      time: 0,
      onTick: onTick,
      onComplete: onComplete,
      cancelled: false,
      completed: false
    };

    this.events.push(eventItem);
    return eventItem;
  }

  updateTime (gameTime) {
    this.timer.lastGameTime = this.timer.gameTime;
    this.timer.gameTime = gameTime;
    this.timer.delta = (gameTime - this.timer.lastGameTime);
  }

  getEventElapsed (eventItem) {
    return this.timer.gameTime - eventItem.startTime;
  }

  cancelEvent (eventItem) {
    eventItem.endTime = this.timer.gameTime;
    eventItem.cancelled = true;
    eventItem.completed = true;

    eventItem.onComplete(false);
  }

  process (newGameTime) {
    this.updateTime(newGameTime);
    const { gameTime, lastGameTime, delta } = this.timer;

    this.events.forEach(item => {
      if (item.completed) {
        return;
      }

      item.time += delta;

      if (gameTime >= item.endTime) {
        const { startTime, runLength, time } = item;

        item.completed = true;
        item.onComplete(true);
      } else {
        item.onTick(gameTime, delta);
      }
    });

    this.events = this.events.filter(item => {
      return !item.completed;
    });
  }


};

module.exports = EventTimer;
