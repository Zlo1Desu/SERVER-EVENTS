const TOTEM_COORDS = [
  { x: 10, y: -60, z: 10 },
  { x: -10, y: -60, z: 10 },
  { x: 0, y: -60, z: 10 },
];

// 1. Команда запуска
ServerEvents.commandRegistry((event) => {
  const { commands: Commands } = event;
  event.register(
    Commands.literal("startevent")
      .requires((src) => src.hasPermission(2))
      .executes((ctx) => {
        let server = ctx.source.server;
        let level = ctx.source.level;

        server.persistentData.totemsClicked = 0;
        server.persistentData.totalTotems = TOTEM_COORDS.length;

        TOTEM_COORDS.forEach((coord) => {
          let lightning = level.createEntity("minecraft:lightning_bolt");
          lightning.setPosition(coord.x, coord.y, coord.z);
          lightning.spawn();

          // ВИЗУАЛ (оставляем маленьким, без хитбокса)
          let visual = level.createEntity("minecraft:armor_stand");
          visual.setPosition(coord.x, coord.y, coord.z);
          visual.mergeNbt(
            `{Marker:1b, Invisible:1b, NoGravity:1b, Small:1b, Tags:["totem_visual"], ArmorItems:[{},{},{},{id:"minecraft:totem_of_undying",Count:1b}]}`,
          );
          visual.spawn();

          // ХИТБОКС (Убрали Small:1b, теперь он 2 блока в высоту и ловит любые клики)
          // Добавили Invulnerable:1b, чтобы он не ломался от 1 удара
          let hitbox = level.createEntity("minecraft:armor_stand");
          hitbox.setPosition(coord.x, coord.y, coord.z);
          hitbox.mergeNbt(
            `{Invisible:1b, NoGravity:1b, Invulnerable:1b, Tags:["event_totem"]}`,
          );
          hitbox.spawn();
        });

        ctx.source.sendSuccess("Ивент начался! Тотемы появились.", true);
        return 1;
      }),
  );
});

// 2. Общая логика активации (чтобы не писать код дважды для ЛКМ и ПКМ)
function activateTotem(target, player, server, level) {
  target.removeTag("event_totem");
  target.kill(); // Сразу удаляем хитбокс

  let visualTotem = null;
  let box = target.getBoundingBox().inflate(1.0);
  let entities = level.getEntitiesWithin(box);

  // Ищем наш визуал
  for (let e of entities) {
    if (e.type === "minecraft:armor_stand" && e.tags.contains("totem_visual")) {
      visualTotem = e;
      break;
    }
  }

  if (visualTotem) {
    visualTotem.removeTag("totem_visual");

    server.runCommandSilent(
      `playsound minecraft:entity.lightning_bolt.thunder ambient @a ${visualTotem.x} ${visualTotem.y} ${visualTotem.z} 1.0 1.0`,
    );
    server.runCommandSilent(
      `particle minecraft:flame ${visualTotem.x} ${visualTotem.y + 1} ${visualTotem.z} 0.5 0.5 0.5 0.05 50`,
    );

    // Плавный взлет
    for (let i = 0; i <= 20; i++) {
      server.scheduleInTicks(i, (ctx) => {
        visualTotem.setPosition(
          visualTotem.x,
          visualTotem.y + 0.15,
          visualTotem.z,
        );
      });
    }

    // Удаление с дымком
    server.scheduleInTicks(20, (ctx) => {
      server.runCommandSilent(
        `particle minecraft:poof ${visualTotem.x} ${visualTotem.y + 1} ${visualTotem.z} 0.5 0.5 0.5 0.05 20`,
      );
      visualTotem.kill();
    });
  }

  // Логика барьера
  let clicked = (server.persistentData.totemsClicked || 0) + 1;
  server.persistentData.totemsClicked = clicked;
  let total = server.persistentData.totalTotems || TOTEM_COORDS.length;

  player.tell(`§eАктивировано тотемов: ${clicked}/${total}`);

  if (clicked >= total) {
    server.runCommandSilent("worldborder set 2500 10");
    server.runCommandSilent(
      'title @a title {"text":"Барьер расширен!","color":"gold"}',
    );
    let soundX = visualTotem ? visualTotem.x : target.x;
    server.runCommandSilent(
      `playsound minecraft:ui.toast.challenge_complete master @a ${soundX} ${target.y} ${target.z} 1.0 1.0`,
    );
  }
}

// 3. Обработка ПКМ (Правая кнопка мыши - взаимодействие)
ItemEvents.entityInteracted((event) => {
  let target = event.getTarget();
  if (
    target.type === "minecraft:armor_stand" &&
    target.tags.contains("event_totem")
  ) {
    event.cancel();
    activateTotem(
      target,
      event.getEntity(),
      event.getServer(),
      event.getLevel(),
    );
  }
});

// 4. Обработка ЛКМ (Левая кнопка мыши - удар)
EntityEvents.hurt((event) => {
  let target = event.getEntity();
  // Проверяем, что ударили именно по нашему хитбоксу
  if (
    target.type === "minecraft:armor_stand" &&
    target.tags.contains("event_totem")
  ) {
    event.cancel(); // Отменяем стандартный урон

    let source = event.getSource();
    if (source.getPlayer()) {
      // Проверяем, что ударил именно игрок
      activateTotem(
        target,
        source.getPlayer(),
        event.getServer(),
        event.getLevel(),
      );
    }
  }
});
