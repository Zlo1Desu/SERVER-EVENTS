// Подгружаем нужные классы Java для создания виртуального меню
const SimpleMenuProvider = Java.loadClass('net.minecraft.world.SimpleMenuProvider');
const ChestMenu = Java.loadClass('net.minecraft.world.inventory.ChestMenu');
const SimpleContainer = Java.loadClass('net.minecraft.world.SimpleContainer');
const MCComponent = Java.loadClass('net.minecraft.network.chat.Component');
const EntityArgument = Java.loadClass('net.minecraft.commands.arguments.EntityArgument');
const JInteger = Java.loadClass('java.lang.Integer');

// Твои 12 видов карточек (здесь примеры, можешь менять команды и названия под свои нужды)
const CARD_TYPES = [
  {
          id: 13,
          name: "Милая совушка",
          effect: (player) => {
              let server = player.server;

              // Получаем координаты игрока для спавна родителей перед ним
              let x = Math.floor(player.x);
              let y = Math.floor(player.y);
              let z = Math.floor(player.z);

              // 1. Спавним "Маму" и "Папу" (NoAI:1b делает их неподвижными)
              server.runCommandSilent(`summon villager ${x + 2} ${y} ${z + 2} {Tags:["event_mom"], CustomName:'{"text":"МАМА"}', CustomNameVisible:1b, NoAI:1b}`);
              server.runCommandSilent(`summon villager ${x - 2} ${y} ${z + 2} {Tags:["event_dad"], CustomName:'{"text":"ПАПА"}', CustomNameVisible:1b, NoAI:1b}`);

              // 2. Реплика мамы (через 1.5 секунды) - меняем имя сущности
              server.scheduleInTicks(30, ctx => {
                  server.runCommandSilent(`data merge entity @e[tag=event_mom,limit=1] {CustomName:'{"text":"МАМА: Мы просто посмотреть."}'}`);
              });

              // 3. Реплика папы (через 3.5 секунды)
              server.scheduleInTicks(70, ctx => {
                  server.runCommandSilent(`data merge entity @e[tag=event_dad,limit=1] {CustomName:'{"text":"ПАПА: Что может пойти не так?"}'}`);
              });

              // 4. Падение наковален с неба (через 5.5 секунд)
              server.scheduleInTicks(110, ctx => {
                  server.runCommandSilent(`setblock ${x + 2} ${y + 15} ${z + 2} damaged_anvil`);
                  server.runCommandSilent(`setblock ${x - 2} ${y + 15} ${z + 2} damaged_anvil`);
              });

              // 5. Трагичный финал и дебаффы (через 7 секунд, когда наковальни долетят)
              server.scheduleInTicks(140, ctx => {
                  // Кровавые частицы для драматизма
                  server.runCommandSilent(`particle minecraft:block redstone_block ${x + 2} ${y + 1} ${z + 2} 0.5 0.5 0.5 0.1 50`);
                  server.runCommandSilent(`particle minecraft:block redstone_block ${x - 2} ${y + 1} ${z + 2} 0.5 0.5 0.5 0.1 50`);

                  // Убиваем сущности
                  server.runCommandSilent(`kill @e[tag=event_mom]`);
                  server.runCommandSilent(`kill @e[tag=event_dad]`);
                  server.runCommandSilent(`playsound minecraft:entity.player.hurt master @a ${x} ${y} ${z} 1.0 1.0`);

                  // Каноничное сообщение в чат
                  server.runCommandSilent(`tellraw ${player.username} {"text":"у вас умерли мама и папа(((((","color":"gray"}`);

                  // Выдаем дебаффы как в видео
                  server.runCommandSilent(`effect give ${player.username} slowness 30 1`);
                  server.runCommandSilent(`effect give ${player.username} nausea 10 0`);

                  // Имитация эффекта "Бездомный" (выдаем бесполезный предмет с таким названием)
                  server.runCommandSilent(`give ${player.username} dirt{display:{Name:'{"text":"Эффект: Бездомный","color":"dark_gray","italic":false}'}} 1`);
              });
          }
      }

];

ServerEvents.commandRegistry(event => {
    event.register(
        event.commands.literal('startquiz')
            .requires(src => src.hasPermission(2))
            .then(event.commands.argument('target', EntityArgument.player())
                .executes(ctx => {
                    let target = EntityArgument.getPlayer(ctx, 'target');

                    // ФИКС: Используем правильно загруженный JInteger
                    let containerSize = JInteger.valueOf(54);
                    let container = new SimpleContainer(containerSize);

                    // Индексы слотов для сетки 5x4
                    const gridSlots = [
                        11, 12, 13, 14, 15,
                        20, 21, 22, 23, 24,
                        29, 30, 31, 32, 33,
                        38, 39, 40, 41, 42
                    ];

                    gridSlots.forEach(slot => {
                        let randomCard = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];

                        let item = Item.of('minecraft:paper', `{QuizCard:1b, CardID:${randomCard.id}, display:{Name:'{"text":"Секретная карта","color":"gold","bold":true}', Lore:['{"text":"Shift-кликни, чтобы открыть!","color":"gray","italic":true}']}}`);

                        // ФИКС: Точно так же применяем JInteger для слота
                        container.setItem(JInteger.valueOf(slot), item);
                    });

                    let provider = new SimpleMenuProvider((containerId, playerInv, player) => {
                        return ChestMenu.sixRows(containerId, playerInv, container);
                    }, MCComponent.literal("Выберите карту судьбы"));

                    target.openMenu(provider);
                    ctx.source.player.tell(`Викторина запущена для игрока ${target.getName().getString()}.`);

                    return 1;
                })
            )
    );
});
// Перехват клика (когда игрок забирает карту)
PlayerEvents.inventoryChanged(event => {
    let item = event.item;

    // Проверяем, является ли предмет нашей карточкой
    if (item.nbt && item.nbt.QuizCard == 1) {
        let player = event.player;
        let cardId = item.nbt.CardID;
        let cardInfo = CARD_TYPES.find(c => c.id == cardId);

        // 1. Мгновенно удаляем карту из инвентаря игрока
        player.inventory.clear(item);

        // 2. Закрываем виртуальное меню
        player.closeMenu();

        // 3. Воспроизводим событие карты
        if (cardInfo) {
            player.server.runCommandSilent(`playsound minecraft:ui.toast.challenge_complete master ${player.username} ~ ~ ~ 1.0 1.0`);
            player.server.runCommandSilent(`title ${player.username} title {"text":"${cardInfo.name}","color":"yellow"}`);

            // Запускаем саму функцию эффекта
            cardInfo.effect(player);
        }
    }
});
