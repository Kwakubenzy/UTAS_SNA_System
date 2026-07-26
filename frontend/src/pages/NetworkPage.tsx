import React from 'react';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { NetworkGraph } from '../components/Analysis/NetworkGraph';

export const NetworkPage: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="p-4 sm:p-6 lg:p-8"
  >
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <Share2 className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-navy-900 dark:text-white">Social Network Visualization</h1>
        <p className="text-sm text-slate-500 dark:text-navy-300">
          Students as nodes, friendships as edges &mdash; colored by political affiliation, sized by PageRank
        </p>
      </div>
    </div>

    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Friendship network</h3>
      </CardHeader>
      <CardBody>
        <NetworkGraph height={640} />
      </CardBody>
    </Card>
  </motion.div>
);
