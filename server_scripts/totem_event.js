const TOTEM_COORDS = [
  { x: 10, y: -59, z: 10 },
  { x: -10, y: -59, z: 10 },
  { x: 0, y: -59, z: 10 },
];

// Улучшенный эффект появления
function spawnImpressiveEffect(level, x, y, z) {
  // 1. Звук появления
  level.server.runCommandSilent(
    `playsound minecraft:block.beacon.activate master @a ${x} ${y} ${z} 1.0 1.0`,
  );

  // 2. Вертикальный луч из end_rod (эффект призыва)
  for (let i = 0; i < 15; i++) {
    level.server.runCommandSilent(
      `particle minecraft:end_rod ${x} ${y + i * 0.1} ${z} 0 0 0 0.05 1`,
    );
  }

  // 3. Магические искры (enchant)
  for (let i = 0; i < 40; i++) {
    let offsetX = (Math.random() - 0.5) * 1.5;
    let offsetY = (Math.random() - 0.5) * 1.5;
    let offsetZ = (Math.random() - 0.5) * 1.5;
    level.server.runCommandSilent(
      `particle minecraft:enchant ${x + offsetX} ${y + offsetY} ${z + offsetZ} 0 0 0 0.1 1`,
    );
  }
}

ServerEvents.commandRegistry((event) => {
  event.register(
    event.commands
      .literal("event1-berier")
      .requires((src) => src.hasPermission(2))
      .executes((ctx) => {
        let level = ctx.source.level;

        // Очистка старых объектов
        level
          .getEntities()
          .filter((e) => e.tags.contains("event_totem"))
          .forEach((e) => e.kill());
        level
          .getEntities()
          .filter((e) => e.tags.contains("totem_visual"))
          .forEach((e) => e.kill());

        TOTEM_COORDS.forEach((coord) => {
          let bx = Math.floor(coord.x);
          let by = Math.floor(coord.y - 1);
          let bz = Math.floor(coord.z);

          // 1. Ставим обсидиан через команду (надежный способ)
          level.server.runCommandSilent(
            `setblock ${bx} ${by} ${bz} minecraft:obsidian`,
          );

          // 2. Запускаем новый магический эффект
          spawnImpressiveEffect(level, coord.x, coord.y, coord.z);

          // 3. Визуальный тотем
          let visual = level.createEntity("minecraft:armor_stand");
          visual.setPosition(coord.x, coord.y - 0.9, coord.z);
          visual.tags.add("totem_visual");
          visual.mergeNbt(
            `{Marker:1b, Invisible:1b, NoGravity:1b, Small:1b, ArmorItems:[{},{},{},{id:"minecraft:totem_of_undying",count:1}]}`,
          );
          visual.spawn();

          // 4. Хитбокс
          let hitbox = level.createEntity("minecraft:armor_stand");
          hitbox.setPosition(coord.x, coord.y - 0.9, coord.z);
          hitbox.tags.add("event_totem");
          hitbox.mergeNbt(`{Invisible:1b, NoGravity:1b, Invulnerable:1b}`);
          hitbox.spawn();
        });

        ctx.source.player.tell("Ивент запущен! Тотемы призваны.");
        return 1;
      }),
  );
});

// ДАТЧИК ПРИБЛИЖЕНИЯ
PlayerEvents.tick((event) => {
  if (event.level.time % 20 != 0) return;

  let player = event.player;
  let nearby = event.level.getEntitiesWithin(
    player.getBoundingBox().inflate(2.0),
  );

  nearby.forEach((entity) => {
    if (entity.tags.contains("event_totem")) {
      activateTotem(event.level, entity);
    }
  });
});

function activateTotem(level, target) {
  let server = level.server;

  // Эффекты при активации
  server.runCommandSilent(
    `particle minecraft:flame ${target.x} ${target.y + 1} ${target.z} 0.5 0.5 0.5 0.05 50`,
  );
  server.runCommandSilent(
    `playsound minecraft:entity.enderman.teleport ambient @a ${target.x} ${target.y} ${target.z} 1.0 0.5`,
  );

  let visualTotem = level
    .getEntitiesWithin(target.getBoundingBox().inflate(1.0))
    .find((e) => e.tags.contains("totem_visual"));

  if (visualTotem) {
    visualTotem.removeTag("totem_visual");

    // Анимация вращения + взлета
    for (let i = 0; i <= 20; i++) {
      server.scheduleInTicks(i, (ctx) => {
        visualTotem.setPosition(
          visualTotem.x,
          visualTotem.y + 0.15,
          visualTotem.z,
        );
        visualTotem.setRotation(visualTotem.rotation + 45, 0);
      });
    }

    // Финальный взрыв частиц
    server.scheduleInTicks(20, (ctx) => {
      server.runCommandSilent(
        `particle minecraft:large_smoke ${visualTotem.x} ${visualTotem.y} ${visualTotem.z} 0.2 0.2 0.2 0.1 20`,
      );
      server.runCommandSilent(
        `particle minecraft:poof ${visualTotem.x} ${visualTotem.y} ${visualTotem.z} 0.2 0.2 0.2 0.1 20`,
      );
      visualTotem.kill();
    });
  }

  target.kill();

  // Динамический подсчет
  let remaining = level
    .getEntities()
    .filter((e) => e.tags.contains("event_totem")).length;

  if (remaining <= 0) {
    // --- ЭПИЧНЫЙ ФИНАЛ ---
    server.runCommandSilent("worldborder set 2500 10");

    // 1. Мощный взрывной звук на всю карту (громкость 10.0)
    server.runCommandSilent(
      "playsound minecraft:entity.generic.explode master @a ~ ~ ~ 10.0 0.5",
    );

    // 2. Дополнительный "гул" для эффекта вибрации
    server.runCommandSilent(
      "playsound minecraft:entity.wither.spawn master @a ~ ~ ~ 5.0 0.5",
    );

    server.runCommandSilent(
      'title @a title {"text":"Барьер расширен!","color":"gold"}',
    );
  } else {
    server.runCommandSilent(
      `title @a actionbar {"text":"Тотем активирован! Осталось: ${remaining}","color":"green"}`,
    );
  }
}
