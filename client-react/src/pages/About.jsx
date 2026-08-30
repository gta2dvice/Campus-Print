import { Link } from 'react-router-dom';
import SocialLinks from '../components/SocialLinks';
import '../styles/effects.css';
import '../styles/about-effects.css';

const TEAM = [
  {
    id: 'card-1',
    name: 'Ankit Chaurasia',
    role: 'Founder & Designer',
    desc: 'Obsessed with great design and smooth user experiences. Brings the visual side to life — from branding to every pixel on this page.',
    img: '/assets/member1.jpg',
    seed: 'AnkitChaurasia',
    bg: 'b6e3f4',
    glow: '',
    ring: '',
    links: [
      { platform: 'instagram', href: 'https://www.instagram.com/ankit.95_?igsh=MTlyaDVxemc4dmVmNA==', label: '@ankit.95_' },
      { platform: 'linkedin', href: 'https://www.linkedin.com/in/ankit-chaurasia-ab126239b/', label: 'Ankit Chaurasia' },
      { platform: 'github', href: 'https://github.com/gta2dvice', label: 'gta2dvice' },
    ],
  },
  {
    id: 'card-2',
    name: 'Atishay Jain',
    role: 'Co-Founder & Developer',
    desc: 'Passionate about building tools that actually solve real student problems. Handles the tech, the servers, and anything that involves code.',
    img: '/assets/member2.jpg',
    seed: 'AtishayJain',
    bg: 'ffd5dc',
    glow: 'card-glow--2',
    ring: 'card-avatar-ring--2',
    links: [
      { platform: 'instagram', href: 'https://www.instagram.com/miraculous.jain_16?igsh=MTY3N3Vnbjk1Mms4cA==', label: '@miraculous.jain_16' },
      { platform: 'linkedin', href: 'https://www.linkedin.com/in/atishay-jain-433594326/', label: 'Atishay Jain' },
      { platform: 'github', href: 'https://github.com/PseudoCoder16', label: 'PseudoCoder16' },
    ],
  },
];

export default function About() {
  return (
    <div className="about-page-bg flex min-h-screen flex-col">
      <header className="flex justify-center px-8 py-6">
        <nav className="flex gap-8">
          <Link to="/" className="nav-link font-medium text-gray-600 hover:text-gray-900">Home</Link>
          <Link to="/about" className="nav-link nav-link--active font-medium text-blue-500">About Us</Link>
          <a href="/#location-section" className="nav-link font-medium text-gray-600 hover:text-gray-900">Location</a>
        </nav>
      </header>

      <section className="relative flex flex-col items-center justify-center overflow-hidden px-8 pb-16 pt-20 text-center">
        <div className="blob absolute -left-24 -top-20 h-[380px] w-[380px] bg-[radial-gradient(circle,#93c5fd,#3b82f6)]" style={{ animationDuration: '9s' }} />
        <div className="blob absolute -right-20 -bottom-10 h-[300px] w-[300px] bg-[radial-gradient(circle,#fde68a,#f59e0b)]" style={{ animationDuration: '11s', animationDelay: '-3s' }} />
        <div className="blob absolute right-[15%] top-[40%] h-[220px] w-[220px] bg-[radial-gradient(circle,#a5f3fc,#06b6d4)]" style={{ animationDuration: '13s', animationDelay: '-6s' }} />

        <div className="relative z-[2]">
          <span className="mb-5 inline-block rounded-full border border-blue-500/25 bg-blue-500/12 px-4 py-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-blue-500 backdrop-blur-sm">Meet the Team</span>
          <h1 className="mb-5 text-[clamp(2.4rem,6vw,4rem)] font-extrabold leading-[1.15] tracking-tight text-gray-900">
            The Minds Behind<br />
            <span className="bg-[linear-gradient(120deg,#3b82f6_0%,#60a5fa_50%,#2563eb_100%)] bg-clip-text text-transparent">Print Campus</span>
          </h1>
          <p className="mx-auto max-w-[520px] text-[1.1rem] leading-relaxed text-gray-600">
            Two students on a mission — making printing on campus fast,<br className="max-md:hidden" />
            affordable, and completely hassle-free.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-8 pb-20 pt-8">
        <div className="grid w-full max-w-[860px] grid-cols-[repeat(auto-fit,minmax(310px,1fr))] gap-10">
          {TEAM.map((m) => (
            <article key={m.id} className="relative cursor-default overflow-hidden rounded-[28px] transition duration-400 hover:-translate-y-2.5 hover:scale-[1.015] hover:shadow-[0_32px_64px_rgba(59,130,246,0.18),0_8px_24px_rgba(0,0,0,0.1)] group">
              <div className={`card-glow ${m.glow}`} />
              <div className="relative z-[1] flex flex-col items-center rounded-[27px] border border-white/60 bg-white/72 px-8 pb-8 pt-10 backdrop-blur-2xl">
                <div className="relative mb-6">
                  <img
                    className="relative z-[2] block h-[110px] w-[110px] rounded-full border-[3px] border-white/90 object-cover shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-transform duration-300 group-hover:scale-[1.06]"
                    src={m.img}
                    alt={m.name}
                    onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/8.x/notionists/svg?seed=${m.seed}&backgroundColor=${m.bg}`; }}
                  />
                  <div className={`card-avatar-ring ${m.ring}`} />
                </div>

                <div className="w-full text-center">
                  <h2 className="mb-1 text-2xl font-bold tracking-tight text-gray-900">{m.name}</h2>
                  <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-blue-500">{m.role}</p>
                  <p className="mb-6 text-[0.97rem] leading-relaxed text-gray-600">{m.desc}</p>
                  <div className="mb-6 h-px bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.1),transparent)]" />
                  <SocialLinks links={m.links} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/[0.07] bg-white/40 px-8 py-6 text-center text-[0.85rem] text-gray-500 backdrop-blur-sm">
        <p>© 2025 Print Campus &nbsp;·&nbsp; Built with ❤️ on campus</p>
      </footer>
    </div>
  );
}
