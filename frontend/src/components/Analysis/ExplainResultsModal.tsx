import React from 'react';
import { BookOpen, Lightbulb } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { NetworkOverview } from '../../hooks/useAnalysisData';

/** Plain-language glossary. Each term gets a definition, an everyday
 *  analogy, and why it matters for campaign planning -- written for a
 *  reader with no background in graph theory. */
const GLOSSARY: Array<{ term: string; meaning: string; analogy: string }> = [
  {
    term: 'Node & Edge',
    meaning: 'A node is one student. An edge is one friendship between two students.',
    analogy: 'Think of a map: nodes are towns, edges are the roads between them.',
  },
  {
    term: 'Network density',
    meaning:
      'What share of all the friendships that could possibly exist actually do. It runs from 0 (nobody knows anybody) to 1 (everyone is friends with everyone).',
    analogy:
      'In a class of 30, if everyone knew everyone the density would be 1. Real friendship networks are always far closer to 0.',
  },
  {
    term: 'Degree centrality',
    meaning: 'Simply how many friends a student has. The most direct measure of popularity.',
    analogy: 'The student who greets half the campus walking to lecture has high degree.',
  },
  {
    term: 'Betweenness centrality',
    meaning:
      'How often a student sits on the shortest route between two other students. It finds the go-betweens, not the popular ones.',
    analogy:
      'A student who has one foot in the football team and one in the debate society. Neither group reaches the other except through them.',
  },
  {
    term: 'Closeness centrality',
    meaning:
      'How few steps it takes a student to reach everyone else, passing friend to friend. High scores mean news reaches them early.',
    analogy: 'Not the person with the most friends, but the one gossip always seems to reach first.',
  },
  {
    term: 'Eigenvector centrality',
    meaning:
      'Influence weighted by the influence of your friends. Ten friends who are themselves well connected count for more than ten who are isolated.',
    analogy: 'Knowing five student leaders opens more doors than knowing fifty people who know nobody.',
  },
  {
    term: 'PageRank',
    meaning:
      'The algorithm Google built to rank web pages, applied to friendships instead of links. A robust all-round importance score.',
    analogy: 'A page is important if important pages link to it; a student is important if important students befriend them.',
  },
  {
    term: 'Clustering coefficient',
    meaning:
      'How often a student’s friends are also friends with each other, forming closed triangles.',
    analogy:
      'High clustering means tight-knit circles where everyone knows everyone. Low clustering means your friends are strangers to each other.',
  },
  {
    term: 'Community',
    meaning:
      'A group of students far more connected to each other than to the rest of campus, found automatically by the Louvain algorithm — nobody labels them in advance.',
    analogy: 'The system discovers the hall cliques, course groups, and hometown circles on its own.',
  },
  {
    term: 'Bridge node',
    meaning:
      'A student who is the only link between two otherwise separate parts of the network. Remove them and the network breaks into disconnected pieces.',
    analogy:
      'The single bridge between two islands. Lose it and there is no route across at all — which is exactly why these students are so valuable to reach.',
  },
  {
    term: 'Influence tier',
    meaning:
      'The system sorts students into High, Medium, and Low by combining their centrality scores, ranked against each other rather than against fixed thresholds.',
    analogy: 'A class ranking rather than a pass mark — it adapts to however large or small the network is.',
  },
];

interface Interpretation {
  heading: string;
  text: string;
}

/** Turns the raw numbers into sentences a non-technical reader can act on.
 *  Thresholds are relative to the network's own size, so this stays
 *  accurate as the dataset grows. */
const interpret = (o: NetworkOverview): Interpretation[] => {
  const out: Interpretation[] = [];
  const pairsPerThousand = Math.round(o.density * 1000);
  // overview.avgDegree is NetworkX's *normalised* degree centrality
  // (degree / (n-1)), so it is not a friend count. The plain-English
  // "how many friends on average" figure has to come from the edge count.
  const avgFriends = o.totalNodes > 0 ? (2 * o.totalEdges) / o.totalNodes : 0;

  out.push({
    heading: `${o.totalNodes} students and ${o.totalEdges} friendships`,
    text:
      `Each student is connected to about ${avgFriends.toFixed(1)} others on average. ` +
      `The density of ${o.density.toFixed(4)} means roughly ${pairsPerThousand} out of every 1,000 ` +
      `possible pairs of students are actually friends.`,
  });

  if (o.density < 0.01) {
    out.push({
      heading: 'This network is sparse',
      text:
        'Only a small fraction of possible friendships have been recorded. That is normal for survey data ' +
        'where each person names just a few friends — it reflects how much has been collected so far, ' +
        'not a flaw in the analysis. More survey responses will fill the picture in.',
    });
  } else {
    out.push({
      heading: 'This network is reasonably well connected',
      text:
        'A good share of possible friendships are present, so the centrality and community results rest ' +
        'on solid coverage.',
    });
  }

  const avgCommunitySize = o.communities > 0 ? o.totalNodes / o.communities : 0;
  if (o.communities > 0 && avgCommunitySize < 4) {
    out.push({
      heading: `${o.communities} communities, the largest holding ${o.largestCommunity} students`,
      text:
        'These groups are very small, which means the survey has captured isolated pockets of friendship ' +
        'rather than the larger social circles that link them. As more responses arrive, small pockets ' +
        'should merge into fewer, bigger, more meaningful communities.',
    });
  } else if (o.communities > 0) {
    out.push({
      heading: `${o.communities} communities, the largest holding ${o.largestCommunity} students`,
      text:
        'The system found genuine social groupings of a useful size. Each one is a distinct audience a ' +
        'campaign can address, and reaching across them is where bridge students matter.',
    });
  }

  if (o.bridgeNodeCount === 0) {
    out.push({
      heading: 'No bridge students yet',
      text:
        'No single student currently sits between two otherwise separate parts of the network. With a ' +
        'sparse network this is expected: the pieces are not yet joined at all, so there is nothing for ' +
        'anyone to bridge. This is a finding about how much data has been collected, not a failure of ' +
        'the method — bridges typically appear once the network becomes better connected.',
    });
  } else {
    out.push({
      heading: `${o.bridgeNodeCount} bridge student${o.bridgeNodeCount === 1 ? '' : 's'} identified`,
      text:
        'These students are the only route between otherwise separate groups. They are the highest-value ' +
        'contacts in the whole network: reaching one carries a message into a group no other contact opens up.',
    });
  }

  if (o.avgClustering < 0.05) {
    out.push({
      heading: 'Friends-of-friends are rarely friends',
      text:
        `The clustering score of ${o.avgClustering.toFixed(4)} is close to zero, meaning almost no closed ` +
        'triangles were recorded — when A names B and B names C, A and C are seldom also linked. ' +
        'Usually this means respondents named only one or two friends each, so the mutual circles around ' +
        'them were never captured.',
    });
  } else {
    out.push({
      heading: 'Tight-knit circles are present',
      text:
        `A clustering score of ${o.avgClustering.toFixed(4)} shows friends often know each other too, ` +
        'forming closed circles. Messages spread quickly inside such groups but can struggle to escape them.',
    });
  }

  return out;
};

interface ExplainResultsModalProps {
  open: boolean;
  onClose: () => void;
  overview: NetworkOverview | null;
}

export const ExplainResultsModal: React.FC<ExplainResultsModalProps> = ({ open, onClose, overview }) => {
  const readings = overview ? interpret(overview) : [];

  return (
    <Modal open={open} onClose={onClose} title="Understanding These Results" widthClassName="max-w-3xl">
      <p className="mb-6 flex items-start gap-2 text-xs text-slate-500 dark:text-navy-400">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
        A plain-language reading of the current analysis, followed by what each technical term actually means.
      </p>

      {overview ? (
        <>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">
            What your numbers mean
          </h3>
          <div className="mb-8 space-y-3">
            {readings.map((r) => (
              <div
                key={r.heading}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-navy-700 dark:bg-navy-900/40"
              >
                <p className="mb-1 text-sm font-semibold text-navy-900 dark:text-white">{r.heading}</p>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-navy-300">{r.text}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mb-8 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-navy-900/40 dark:text-navy-300">
          Run the analysis first and this section will explain your actual results. The glossary below applies
          either way.
        </p>
      )}

      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">
        <BookOpen className="h-4 w-4" />
        Key terms explained
      </h3>
      <div className="space-y-3">
        {GLOSSARY.map((g) => (
          <div key={g.term} className="border-b border-slate-100 pb-3 last:border-0 dark:border-navy-700">
            <p className="mb-1 text-sm font-semibold text-navy-900 dark:text-white">{g.term}</p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-navy-300">{g.meaning}</p>
            <p className="mt-1 text-sm italic leading-relaxed text-slate-500 dark:text-navy-400">{g.analogy}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
};
