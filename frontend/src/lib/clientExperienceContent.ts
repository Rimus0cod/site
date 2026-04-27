import type { AppLanguage } from "../store/preferencesStore";

const extraContent = {
  uk: {
    clientAuth: {
      heroBadge: "Клієнтський профіль",
      profileTitle: "Профіль за номером телефону",
      profileText:
        "Увійдіть або зареєструйтесь за номером, щоб сайт запам'ятав ваш телефон і не запитував його під час наступних записів.",
      registerTitle: "Реєстрація за номером",
      registerText:
        "Створіть короткий PIN, і цей номер стане вашим ідентифікатором для записів на сайті.",
      loginTitle: "Вхід за номером",
      loginText: "Якщо профіль уже є, увійдіть за номером і PIN-кодом.",
      namePlaceholder: "Ваше ім'я",
      phonePlaceholder: "Телефон",
      pinPlaceholder: "PIN-код 4-8 цифр",
      telegramPlaceholder: "Telegram username, якщо хочете нагадування",
      registerAction: "Зареєструватися",
      loginAction: "Увійти",
      logoutAction: "Вийти",
      activeTitle: "Ви увійшли як клієнт",
      activeText:
        "Під час запису номер буде підставлятися автоматично. За потреби ви все одно можете змінити ім'я та Telegram username.",
      phoneLabel: "Номер",
      telegramLabel: "Telegram",
      authError: "Не вдалося виконати дію. Перевірте номер, PIN та спробуйте ще раз.",
      phoneLockedTitle: "Номер уже підтягнеться автоматично",
      phoneLockedText:
        "Цей профіль прив'язаний до номера, тому у формі запису телефон більше не потрібно вводити вручну.",
      guestPrompt:
        "Хочете, щоб сайт запам'ятав ваш номер і не питав його щоразу? Зареєструйтесь у кабінеті клієнта.",
      openCabinet: "Відкрити кабінет клієнта",
    },
    fairUse: {
      badge: "Захист графіка",
      title: "Чесні ліміти на онлайн-запис",
      text:
        "Щоб ніхто не міг паралізувати графік масовими бронюваннями, один номер телефону може тримати не більше двох майбутніх активних записів і лише один онлайн-запис на день.",
    },
    telegramGuide: {
      badge: "Telegram-бот",
      title: "Як користуватися ботом",
      text:
        "Бот допомагає бачити свої записи, отримувати нагадування та швидко знаходити актуальний візит.",
      steps: [
        "1. Відкрийте бота BarberBook у Telegram і натисніть Start.",
        "2. Переконайтесь, що у вашому Telegram профілі є username.",
        "3. Вкажіть цей username під час реєстрації або запису на сайті.",
        "4. Надішліть боту /bookings або повідомлення \"мої записи\".",
      ],
      action: "Відкрити бота",
      note: "Без Telegram username бот не зможе знайти ваші записи.",
    },
  },
  en: {
    clientAuth: {
      heroBadge: "Client profile",
      profileTitle: "Profile linked to your phone number",
      profileText:
        "Sign in or register by phone so the website remembers your number and does not ask for it during future bookings.",
      registerTitle: "Register by phone",
      registerText:
        "Create a short PIN and use your phone number as the main identity for bookings on the site.",
      loginTitle: "Sign in by phone",
      loginText: "If you already have a profile, sign in with your phone number and PIN.",
      namePlaceholder: "Your name",
      phonePlaceholder: "Phone number",
      pinPlaceholder: "PIN code, 4-8 digits",
      telegramPlaceholder: "Telegram username for reminders",
      registerAction: "Register",
      loginAction: "Sign in",
      logoutAction: "Sign out",
      activeTitle: "You are signed in as a client",
      activeText:
        "Your phone number will now be used automatically during booking. You can still edit your name and Telegram username when needed.",
      phoneLabel: "Phone",
      telegramLabel: "Telegram",
      authError: "We could not complete the action. Check the phone number, PIN, and try again.",
      phoneLockedTitle: "Your phone number will be used automatically",
      phoneLockedText:
        "This profile is linked to your phone, so the booking form no longer needs to ask for it manually.",
      guestPrompt:
        "Want the site to remember your phone number and stop asking every time? Register in the client cabinet.",
      openCabinet: "Open client cabinet",
    },
    fairUse: {
      badge: "Schedule protection",
      title: "Fair booking limits",
      text:
        "To prevent abuse and slot hoarding, one phone number can keep no more than two future active bookings and only one online booking for the same day.",
    },
    telegramGuide: {
      badge: "Telegram bot",
      title: "How to use the bot",
      text:
        "The bot helps you see your bookings, receive reminders, and quickly find your current appointment.",
      steps: [
        "1. Open the BarberBook bot in Telegram and press Start.",
        "2. Make sure your Telegram profile has a username.",
        "3. Use the same username during registration or booking on the site.",
        "4. Send /bookings or the message \"my bookings\" to the bot.",
      ],
      action: "Open bot",
      note: "Without a Telegram username, the bot will not be able to match your bookings.",
    },
  },
} as const;

export function getClientExperienceContent(language: AppLanguage) {
  return extraContent[language];
}
