// components/HowItWorksSection.tsx
import { motion } from 'framer-motion';

const steps = [
  {
    number: 1,
    title: "Sign Up",
    desc: "Create your account in seconds with just an email and password.",
    lightBg: "bg-blue-50/80 border-blue-100",
    darkBg: "dark:from-indigo-900/40 dark:to-indigo-800/40",
  },
  {
    number: 2,
    title: "Add Tasks",
    desc: "Quickly capture your ideas, tasks, and goals anytime.",
    lightBg: "bg-purple-50/80 border-purple-100",
    darkBg: "dark:from-purple-900/40 dark:to-purple-800/40",
  },
  {
    number: 3,
    title: "Organize",
    desc: "Categorize, prioritize, and set due dates effortlessly.",
    lightBg: "bg-pink-50/80 border-pink-100",
    darkBg: "dark:from-pink-900/40 dark:to-pink-800/40",
  },
  {
    number: 4,
    title: "Stay Productive",
    desc: "Track progress, get reminders, and achieve more every day.",
    lightBg: "bg-indigo-50/80 border-indigo-100",
    darkBg: "dark:from-blue-900/40 dark:to-blue-800/40",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-purple-900 dark:bg-blue-950 border-t border-indigo-100 dark:border-gray-800 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-6xl font-[900] mb-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent tracking-tight">
            Seamless Workflow
          </h2>
          <p className="text-slate-500 dark:text-gray-400 font-bold uppercase tracking-[0.3em] text-[20px]">Four steps to mastery</p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-4 gap-8 relative">
          {/* Connecting Line (only on desktop) */}
          <div className="hidden md:block absolute top-[4.5rem] left-0 right-0 h-0.5 bg-indigo-100 dark:bg-indigo-500/20" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: i * 0.15 }}
              viewport={{ once: true }}
              className="relative z-10"
            >
              <div
                className={`
                  h-full ${step.lightBg} ${step.darkBg} dark:bg-gradient-to-br
                  backdrop-blur-xl border dark:border-white/5
                  rounded-[2.5rem] p-8 shadow-xl shadow-indigo-500/5
                  group transition-all duration-500 flex flex-col items-center
                  hover:scale-105 hover:-translate-y-2
                `}
              >
                {/* Number Circle */}
                <div className="w-16 h-16 mb-8 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/40 transform -rotate-6 group-hover:rotate-0 transition-transform">
                  {step.number}
                </div>

                {/* Title */}
                <h3 className="text-xl font-black text-indigo-950 dark:text-white mb-4 tracking-tight">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed text-center font-medium">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}