from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

from app.models import db, Student, NetworkMetric, Connection

BRAND_ACCENT = colors.HexColor('#667eea')
BRAND_ACCENT_2 = colors.HexColor('#764ba2')
ROW_ALT = colors.HexColor('#f5f6fa')


def _table_style(header_color):
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), header_color),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ROW_ALT]),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ])


class ReportGenerator:
    """Builds a PDF summary of the current network analysis"""

    @staticmethod
    def generate_network_report():
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=letter,
            topMargin=0.75 * inch, bottomMargin=0.75 * inch,
            leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        )
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('ReportTitle', parent=styles['Title'], spaceAfter=4)
        elements = [
            Paragraph('UTAS Social Network Analysis Report', title_style),
            Paragraph(datetime.utcnow().strftime('Generated %Y-%m-%d %H:%M UTC'), styles['Normal']),
            Spacer(1, 0.3 * inch),
        ]

        total_students = Student.query.count()
        total_connections = Connection.query.count()

        avg_degree = db.session.query(db.func.avg(NetworkMetric.degree_centrality)).scalar() or 0
        avg_betweenness = db.session.query(db.func.avg(NetworkMetric.betweenness_centrality)).scalar() or 0
        avg_closeness = db.session.query(db.func.avg(NetworkMetric.closeness_centrality)).scalar() or 0
        avg_clustering = db.session.query(db.func.avg(NetworkMetric.clustering_coefficient)).scalar() or 0

        community_sizes = db.session.query(
            NetworkMetric.community_id, db.func.count(NetworkMetric.id)
        ).filter(NetworkMetric.community_id != -1).group_by(NetworkMetric.community_id).all()
        community_count = len(community_sizes)
        largest_community = max((count for _, count in community_sizes), default=0)
        bridge_count = NetworkMetric.query.filter_by(bridge_node=True).count()

        if total_students > 1:
            max_edges = (total_students * (total_students - 1)) / 2
            density = total_connections / max_edges if max_edges > 0 else 0
        else:
            density = 0

        elements.append(Paragraph('Network Overview', styles['Heading2']))
        stats_data = [
            ['Metric', 'Value'],
            ['Total Students (Nodes)', str(total_students)],
            ['Total Connections (Edges)', str(total_connections)],
            ['Network Density', f'{density:.4f}'],
            ['Average Degree Centrality', f'{avg_degree:.4f}'],
            ['Average Betweenness Centrality', f'{avg_betweenness:.6f}'],
            ['Average Closeness Centrality', f'{avg_closeness:.4f}'],
            ['Average Clustering Coefficient', f'{avg_clustering:.4f}'],
            ['Communities Detected', str(community_count)],
            ['Largest Community Size', str(largest_community)],
            ['Bridge Nodes', str(bridge_count)],
        ]
        stats_table = Table(stats_data, colWidths=[3 * inch, 2.5 * inch])
        stats_table.setStyle(_table_style(BRAND_ACCENT))
        elements.append(stats_table)
        elements.append(Spacer(1, 0.35 * inch))

        top_metrics = NetworkMetric.query.order_by(
            NetworkMetric.influence_tier.desc(), NetworkMetric.degree_centrality.desc()
        ).limit(20).all()

        if top_metrics:
            elements.append(Paragraph('Top Influencers', styles['Heading2']))
            infl_data = [['Name', 'Tier', 'Degree', 'Betweenness', 'Closeness', 'Party']]
            for m in top_metrics:
                s = Student.query.get(m.student_id)
                if not s:
                    continue
                infl_data.append([
                    s.name, m.influence_tier, f'{m.degree_centrality:.3f}',
                    f'{m.betweenness_centrality:.4f}', f'{m.closeness_centrality:.3f}',
                    s.party or '-',
                ])
            infl_table = Table(infl_data, colWidths=[1.7 * inch, 0.7 * inch, 0.8 * inch, 1.0 * inch, 0.8 * inch, 0.7 * inch])
            infl_table.setStyle(_table_style(BRAND_ACCENT))
            elements.append(infl_table)
            elements.append(Spacer(1, 0.35 * inch))

        bridges = NetworkMetric.query.filter_by(bridge_node=True).order_by(
            NetworkMetric.betweenness_centrality.desc()
        ).limit(20).all()

        if bridges:
            elements.append(Paragraph('Bridge Nodes (Cross-Community Connectors)', styles['Heading2']))
            bridge_data = [['Name', 'Betweenness Centrality', 'Community']]
            for m in bridges:
                s = Student.query.get(m.student_id)
                if not s:
                    continue
                bridge_data.append([s.name, f'{m.betweenness_centrality:.4f}', str(m.community_id)])
            bridge_table = Table(bridge_data, colWidths=[2.7 * inch, 2.3 * inch, 1.5 * inch])
            bridge_table.setStyle(_table_style(BRAND_ACCENT_2))
            elements.append(bridge_table)

        if not top_metrics and not bridges:
            elements.append(Paragraph(
                'No analysis has been run yet. Import data and run analysis to populate this report.',
                styles['Normal']
            ))

        doc.build(elements)
        buffer.seek(0)
        return buffer
