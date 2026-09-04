'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Sparkles,
  Heart,
  TrendingUp,
  Church,
  Code,
  Calendar,
  Brain,
  Sun,
  Network,
  Globe,
  X,
  Search,
  Radio,
  Tv,
  Presentation,
  Scroll,
} from 'lucide-react';
import styles from './SlashCommandPalette.module.css';

interface SlashCommand {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: typeof BookOpen;
  action: (arg: string, router: any) => void;
}

const COMMANDS: SlashCommand[] = [
  {
    id: 'verse',
    name: '/verse',
    category: 'Scripture',
    description: 'Jump to or search Scripture passage (e.g. /verse John 3:16)',
    icon: BookOpen,
    action: (arg, router) => {
      const q = arg.trim() || 'John 1';
      router.push(`/bible?q=${encodeURIComponent(q)}`);
    },
  },
  {
    id: 'encourage',
    name: '/encourage',
    category: 'Encouragement',
    description: 'Find biblical promises, peace, and artist inspiration (e.g. /encourage anxiety)',
    icon: Sparkles,
    action: (arg, router) => {
      const q = arg.trim();
      router.push(`/encourage${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    },
  },
  {
    id: 'pray',
    name: '/pray',
    category: 'Prayer Care',
    description: 'Create a prayer commitment or petition (e.g. /pray Healing for Mom)',
    icon: Heart,
    action: (arg, router) => {
      const title = arg.trim();
      router.push(`/prayer?action=new${title ? `&title=${encodeURIComponent(title)}` : ''}`);
    },
  },
  {
    id: 'escalate',
    name: '/escalate',
    category: 'Prayer Care',
    description: 'Open prayer escalation ladder (Private -> Circle -> Church -> Atlas)',
    icon: TrendingUp,
    action: (_arg, router) => {
      router.push('/prayer');
    },
  },
  {
    id: 'church',
    name: '/church',
    category: 'Ministry',
    description: 'Open Church Hub, member invite links, and embeddable website widgets',
    icon: Church,
    action: (_arg, router) => {
      router.push('/church');
    },
  },
  {
    id: 'sdk',
    name: '/sdk',
    category: 'Developers',
    description: 'Open TypeScript SDK, REST API reference, and MCP setup guide',
    icon: Code,
    action: (_arg, router) => {
      router.push('/developers');
    },
  },
  {
    id: 'atlas',
    name: '/atlas',
    category: 'Prayer Atlas',
    description: 'Explore the 2D global interactive vector PrayerAtlas',
    icon: Globe,
    action: (_arg, router) => {
      router.push('/prayer');
    },
  },
  {
    id: 'strongs',
    name: '/strongs',
    category: 'Lexicon',
    description: 'Lookup Strong’s Greek or Hebrew lemma definition (e.g. /strongs G2889)',
    icon: Search,
    action: (arg, router) => {
      const num = arg.trim() || 'G2889';
      router.push(`/bible?strongs=${encodeURIComponent(num)}`);
    },
  },
  {
    id: 'plan',
    name: '/plan',
    category: 'Discipleship',
    description: 'Track Bible reading plans and devotional goals',
    icon: Calendar,
    action: (_arg, router) => {
      router.push('/plans');
    },
  },
  {
    id: 'memory',
    name: '/memory',
    category: 'Discipleship',
    description: 'Practice verse memorization with active recall flashcards',
    icon: Brain,
    action: (_arg, router) => {
      router.push('/memory');
    },
  },
  {
    id: 'daily',
    name: '/daily',
    category: 'Daily Rhythms',
    description: 'View today’s Scripture passage and audio devotional reflection',
    icon: Sun,
    action: (_arg, router) => {
      router.push('/daily');
    },
  },
  {
    id: 'graph',
    name: '/graph',
    category: 'Study',
    description: 'Explore the bidirectional Biblical Knowledge Concept Graph',
    icon: Network,
    action: (_arg, router) => {
      router.push('/graph');
    },
  },
  {
    id: 'radio',
    name: '/radio',
    category: 'Worship',
    description: 'Launch Live Worship Radio dock with ambient hymns, K-LOVE & Air1',
    icon: Radio,
    action: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bibledesk:open-radio'));
      }
    },
  },
  {
    id: 'sermon',
    name: '/sermon',
    category: 'Ministry',
    description: 'Open Church Live Sermon Theatre and sermon outline study notes',
    icon: Tv,
    action: (_arg, router) => {
      router.push('/sermons');
    },
  },
  {
    id: 'slides',
    name: '/slides',
    category: 'Ministry',
    description: 'Launch 1-Click ProPresenter 7 projector slide generator',
    icon: Presentation,
    action: (_arg, router) => {
      router.push('/sermons');
    },
  },
  {
    id: 'catechism',
    name: '/catechism',
    category: 'Theology',
    description: 'Explore 6 historic confessions & catechisms with interactive quiz mode',
    icon: Scroll,
    action: (_arg, router) => {
      router.push('/catechism');
    },
  },
];

export default function SlashCommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputActive =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true';

      // Open on '/' (when not typing in an input) or 'Ctrl+/'
      if ((e.key === '/' && !isInputActive) || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        e.preventDefault();
        setIsOpen(true);
        setInputValue('/');
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Filter commands based on input
  const query = inputValue.startsWith('/') ? inputValue.slice(1) : inputValue;
  const firstWord = query.split(' ')[0].toLowerCase();
  const argument = query.slice(firstWord.length).trim();

  const filteredCommands = COMMANDS.filter(cmd => {
    if (!firstWord) return true;
    return (
      cmd.name.toLowerCase().includes(firstWord) ||
      cmd.category.toLowerCase().includes(firstWord) ||
      cmd.description.toLowerCase().includes(firstWord)
    );
  });

  const handleExecute = (cmd: SlashCommand) => {
    setIsOpen(false);
    setInputValue('');
    cmd.action(argument, router);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleExecute(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.inputWrapper}>
          <div className={styles.slashBadge}>/</div>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Type a slash command or search feature (e.g. /verse, /encourage, /pray)..."
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
          />
          <span className={styles.shortcutBadge}>ESC to close</span>
        </div>

        <div className={styles.commandList}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#8c826e', fontSize: '0.9rem' }}>
              No slash commands match "{query}". Try <code>/verse</code>, <code>/encourage</code>, or <code>/pray</code>.
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`${styles.commandItem} ${isSelected ? styles.commandItemActive : ''}`}
                  onClick={() => handleExecute(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className={styles.iconBox}>
                    <Icon size={18} />
                  </div>
                  <div className={styles.commandContent}>
                    <div className={styles.commandTitleRow}>
                      <span className={styles.commandName}>{cmd.name}</span>
                      <span className={styles.commandCategory}>{cmd.category}</span>
                    </div>
                    <div className={styles.commandDescription}>{cmd.description}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className={styles.footer}>
          <div className={styles.keyHints}>
            <span className={styles.keyHint}>
              <kbd className={styles.kbd}>↑</kbd> <kbd className={styles.kbd}>↓</kbd> navigate
            </span>
            <span className={styles.keyHint}>
              <kbd className={styles.kbd}>↵</kbd> select
            </span>
            <span className={styles.keyHint}>
              <kbd className={styles.kbd}>/</kbd> open anywhere
            </span>
          </div>
          <span>BibleDesk Slash System</span>
        </footer>
      </div>
    </div>
  );
}
