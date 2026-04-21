export const SHOP_INFO = {
  name: "BarberBook Studio",
  city: "Kyiv",
  address: "24 Yaroslavska St, Podil",
  phone: "+380 67 555 21 21",
  telegram: "@barberbook_studio",
  instagram: "@barberbook.studio",
  hours: [
    { label: "Mon-Fri", value: "09:00-20:00" },
    { label: "Sat", value: "10:00-18:00" },
    { label: "Sun", value: "By schedule only" },
  ],
  highlights: [
    "Real-time slots based on barber schedules and service duration",
    "Quick guest booking with optional Telegram reminders",
    "Easy reschedule or cancel flow from your personal booking link",
  ],
  policies: [
    "Free reschedule or cancel up to 2 hours before the visit.",
    "If you are running late, message us in Telegram and we will try to hold the chair.",
    "For beard and combo services, please arrive 5 minutes early.",
  ],
  faq: [
    {
      question: "Can I book without registration?",
      answer: "Yes. Name and phone are enough, and Telegram is optional for reminders.",
    },
    {
      question: "How do reminders work?",
      answer:
        "If you add your Telegram username and start our bot, we can send booking updates and reminders there.",
    },
    {
      question: "Can I switch barber later?",
      answer:
        "The self-service link keeps the same barber and service. For a bigger change, contact the shop directly.",
    },
  ],
} as const;
