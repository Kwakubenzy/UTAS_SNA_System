import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { FileText, FileDown, FileSpreadsheet, FileType, Users, Link2, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import api from '../services/api';
import { useStudents } from '../hooks/useStudents';
import { useAnalysisData } from '../hooks/useAnalysisData';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { downloadCsv } from '../utils/csvExport';
import { downloadXlsx } from '../utils/excelExport';
import { ConnectionListItem } from '../types';

const dateStamp = () => new Date().toISOString().slice(0, 10);

const ReportCard: React.FC<{
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, description, children }) => (
  <Card>
    <CardHeader className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-blue-500/10 dark:text-blue-300">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">{title}</h3>
    </CardHeader>
    <CardBody>
      <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-navy-300">{description}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </CardBody>
  </Card>
);

export const Reports: React.FC = () => {
  const { students, loading: studentsLoading } = useStudents();
  const { influencers, loading: analysisLoading } = useAnalysisData();
  const [connections, setConnections] = useState<ConnectionListItem[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      setConnectionsLoading(true);
      try {
        const response = await api.getConnections();
        if (response.success) setConnections(response.connections || []);
      } catch {
        // Non-fatal -- the connections export button just stays disabled.
      } finally {
        setConnectionsLoading(false);
      }
    };
    fetchConnections();
  }, []);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const blob = await api.downloadReport();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sna_report_${dateStamp()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to generate report');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const studentHeaders = ['Student ID', 'Name', 'Party', 'College', 'Department', 'Year', 'Email', 'Phone'];
  const studentRows = students.map((s) => [
    s.student_id,
    s.name,
    s.party || '',
    s.college || '',
    s.department || '',
    s.year ?? '',
    s.email || '',
    s.phone || '',
  ]);

  const connectionHeaders = ['From', 'To', 'Relationship Type', 'Strength'];
  const connectionRows = connections.map(({ connection, from_student, to_student }) => [
    from_student.name,
    to_student.name,
    connection.relationship_type || '',
    connection.strength,
  ]);

  const centralityHeaders = ['Name', 'Student ID', 'Party', 'Degree', 'Betweenness', 'Closeness', 'Eigenvector', 'PageRank', 'Tier'];
  const centralityRows = influencers.map((i) => [
    i.student.name,
    i.student.student_id,
    i.student.party || '',
    i.metrics.degree_centrality,
    i.metrics.betweenness_centrality,
    i.metrics.closeness_centrality,
    i.metrics.eigenvector_centrality ?? 0,
    i.metrics.pagerank_score,
    i.metrics.influence_tier,
  ]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-500/10 dark:text-blue-300">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy-900 dark:text-white">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-navy-300">Generate and download reports from the current data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ReportCard
          icon={FileType}
          title="Network Analysis Report"
          description="A formatted PDF summary of the network overview, top influencers, and bridge nodes — suitable for printing or sharing."
        >
          <Button icon={<FileDown className="h-4 w-4" />} loading={downloadingPdf} onClick={handleDownloadPdf}>
            Download PDF
          </Button>
        </ReportCard>

        <ReportCard
          icon={Users}
          title="Students Export"
          description={`Full student roster with party, college, department, and contact details (${students.length} students).`}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText className="h-3.5 w-3.5" />}
            disabled={studentsLoading || students.length === 0}
            onClick={() => downloadCsv(`students_${dateStamp()}.csv`, studentHeaders, studentRows)}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            disabled={studentsLoading || students.length === 0}
            onClick={() => downloadXlsx(`students_${dateStamp()}.xlsx`, 'Students', studentHeaders, studentRows)}
          >
            Export Excel
          </Button>
        </ReportCard>

        <ReportCard
          icon={Link2}
          title="Connections Export"
          description={`Friendship records with relationship type and strength (${connections.length} connections).`}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText className="h-3.5 w-3.5" />}
            disabled={connectionsLoading || connections.length === 0}
            onClick={() => downloadCsv(`connections_${dateStamp()}.csv`, connectionHeaders, connectionRows)}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            disabled={connectionsLoading || connections.length === 0}
            onClick={() => downloadXlsx(`connections_${dateStamp()}.xlsx`, 'Connections', connectionHeaders, connectionRows)}
          >
            Export Excel
          </Button>
        </ReportCard>

        <ReportCard
          icon={BarChart3}
          title="Centrality Rankings Export"
          description={`Degree, betweenness, closeness, eigenvector, and PageRank scores per student (${influencers.length} ranked students).`}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText className="h-3.5 w-3.5" />}
            disabled={analysisLoading || influencers.length === 0}
            onClick={() => downloadCsv(`centrality_rankings_${dateStamp()}.csv`, centralityHeaders, centralityRows)}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            disabled={analysisLoading || influencers.length === 0}
            onClick={() => downloadXlsx(`centrality_rankings_${dateStamp()}.xlsx`, 'Centrality', centralityHeaders, centralityRows)}
          >
            Export Excel
          </Button>
        </ReportCard>
      </div>
    </motion.div>
  );
};
