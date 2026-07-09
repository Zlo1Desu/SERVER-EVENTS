StartupEvents.registry('item', event => {
    // Регистрируем первую карту
    event.create('card_owl')
        .displayName('Карта: Милая совушка')
        .texture('kubejs:item/card_owl'); // Указываем путь к текстуре

    // Пример регистрации еще одной карты
    event.create('card_bee')
        .displayName('Карта: Пчелка')
        .texture('kubejs:item/card_bee');
    event.create('card_car')
        .displayName('Карта: Скунс на машине')
        .texture('kubejs:item/card_car');
    event.create('card_gu')
        .displayName('Карта: Кенгуру')
        .texture('kubejs:item/card_gu');
    event.create('card_pig')
        .displayName('Карта: Хохол')
        .texture('kubejs:item/card_pig');
    event.create('card_belka')
        .displayName('Карта: Белочка')
        .texture('kubejs:item/card_belka');
    event.create('card_kazah')
        .displayName('Карта: Казах')
        .texture('kubejs:item/card_kazah');
    event.create('card_crab')
        .displayName('Карта: Дохуя умный краб')
        .texture('kubejs:item/card_crab');
    event.create('card_mops')
        .displayName('Карта: Мопс')
        .texture('kubejs:item/card_mops');
    event.create('card_bear')
        .displayName('Карта: Медвед')
        .texture('kubejs:item/card_bear');
    event.create('card_op')
        .displayName('Карта: Дерижабль')
        .texture('kubejs:item/card_op');
    event.create('card_ovta')
        .displayName('Карта: ДонКихот')
        .texture('kubejs:item/card_ovta');
  //
});
