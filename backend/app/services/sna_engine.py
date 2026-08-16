import networkx as nx
import numpy as np
from collections import defaultdict
from sqlalchemy import case
import logging
from app.models import Student, Connection, NetworkMetric, db

logger = logging.getLogger(__name__)

# NetworkMetric.influence_tier is a plain string column ('High'/'Medium'/'Low');
# sorting it directly is alphabetical (Medium > Low > High), not by actual rank.
_TIER_RANK = case(
    (NetworkMetric.influence_tier == 'High', 3),
    (NetworkMetric.influence_tier == 'Medium', 2),
    (NetworkMetric.influence_tier == 'Low', 1),
    else_=0
)

class SNAEngine:
    """Handles all Social Network Analysis calculations"""
    
    def __init__(self):
        self.graph = None
        self.metrics = {}
    
    def build_graph(self):
        """Build NetworkX graph from database"""
        try:
            # Create undirected graph
            self.graph = nx.Graph()
            
            # Add nodes
            students = Student.query.all()
            for student in students:
                self.graph.add_node(
                    student.id,
                    student_id=student.student_id,
                    name=student.name,
                    tribe=student.tribe,
                    party=student.party,
                    college=student.college,
                    department=student.department,
                    year=student.year
                )
            
            # Add edges (connections)
            connections = Connection.query.all()
            for conn in connections:
                weight = conn.strength if conn.strength else 1
                self.graph.add_edge(
                    conn.from_student_id,
                    conn.to_student_id,
                    weight=weight,
                    relationship_type=conn.relationship_type
                )
            
            logger.info(f"Built graph with {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges")
            return True
        
        except Exception as e:
            logger.error(f"Error building graph: {str(e)}")
            return False
    
    def calculate_degree_centrality(self):
        """Calculate degree centrality for all nodes"""
        if self.graph is None:
            return {}
        
        try:
            degree_centrality = nx.degree_centrality(self.graph)
            self.metrics['degree_centrality'] = degree_centrality
            logger.info("Calculated degree centrality")
            return degree_centrality
        except Exception as e:
            logger.error(f"Error calculating degree centrality: {str(e)}")
            return {}
    
    def calculate_betweenness_centrality(self):
        """Calculate betweenness centrality for all nodes"""
        if self.graph is None:
            return {}
        
        try:
            # Use approximation for large graphs
            if self.graph.number_of_nodes() > 1000:
                betweenness = nx.betweenness_centrality(
                    self.graph,
                    k=int(np.sqrt(self.graph.number_of_nodes()))
                )
            else:
                betweenness = nx.betweenness_centrality(self.graph)
            
            self.metrics['betweenness_centrality'] = betweenness
            logger.info("Calculated betweenness centrality")
            return betweenness
        except Exception as e:
            logger.error(f"Error calculating betweenness centrality: {str(e)}")
            return {}
    
    def calculate_closeness_centrality(self):
        """Calculate closeness centrality for all nodes"""
        if self.graph is None:
            return {}
        
        try:
            closeness = nx.closeness_centrality(self.graph)
            self.metrics['closeness_centrality'] = closeness
            logger.info("Calculated closeness centrality")
            return closeness
        except Exception as e:
            logger.error(f"Error calculating closeness centrality: {str(e)}")
            return {}
    
    def calculate_eigenvector_centrality(self):
        """Calculate eigenvector centrality for all nodes.

        Power iteration can fail to converge on sparse/disconnected graphs
        (common with real survey data broken into many small components), so
        this falls back to the numpy eigen-solver, and to all-zeros as a last
        resort -- callers can always rely on this key being present in
        self.metrics rather than needing a fallback of their own.
        """
        if self.graph is None:
            return {}

        try:
            try:
                eigenvector = nx.eigenvector_centrality(self.graph, max_iter=1000)
            except nx.PowerIterationFailedConvergence:
                eigenvector = nx.eigenvector_centrality_numpy(self.graph)
            self.metrics['eigenvector_centrality'] = eigenvector
            logger.info("Calculated eigenvector centrality")
            return eigenvector
        except Exception as e:
            logger.warning(f"Eigenvector centrality unavailable, defaulting to 0: {str(e)}")
            eigenvector = {node: 0.0 for node in self.graph.nodes()}
            self.metrics['eigenvector_centrality'] = eigenvector
            return eigenvector

    def calculate_pagerank(self):
        """Calculate PageRank for all nodes"""
        if self.graph is None:
            return {}
        
        try:
            pagerank = nx.pagerank(self.graph)
            self.metrics['pagerank'] = pagerank
            logger.info("Calculated PageRank")
            return pagerank
        except Exception as e:
            logger.error(f"Error calculating PageRank: {str(e)}")
            return {}
    
    def calculate_clustering_coefficient(self):
        """Calculate clustering coefficient for all nodes"""
        if self.graph is None:
            return {}
        
        try:
            clustering = nx.clustering(self.graph)
            self.metrics['clustering_coefficient'] = clustering
            logger.info("Calculated clustering coefficient")
            return clustering
        except Exception as e:
            logger.error(f"Error calculating clustering coefficient: {str(e)}")
            return {}
    
    def detect_communities_louvain(self):
        """Detect communities using Louvain algorithm"""
        if self.graph is None:
            return {}
        
        try:
            from community import community_louvain
            
            communities = community_louvain.best_partition(self.graph)
            self.metrics['communities'] = communities
            logger.info(f"Detected {len(set(communities.values()))} communities using Louvain")
            return communities
        except ImportError:
            logger.warning("python-louvain not installed, skipping community detection")
            return {}
        except Exception as e:
            logger.error(f"Error detecting communities: {str(e)}")
            return {}
    
    def identify_bridge_nodes(self):
        """Identify bridge nodes: students whose removal would break the
        network into more pieces than before -- articulation points, or cut
        vertices, in graph terms.

        This is the definition the project actually uses. An earlier version
        instead looked for nodes with above-average betweenness whose
        neighbours spanned two or more Louvain communities, which could never
        fire on real survey data: Louvain assigns each disconnected component
        its own community, so a node's neighbours are always inside that one
        community and the test was unsatisfiable. On a 717-student network
        holding 77 genuine cut vertices it reported zero.
        """
        if self.graph is None:
            return {}

        try:
            betweenness = self.metrics.get('betweenness_centrality', {})
            communities = self.metrics.get('communities', {})

            bridge_nodes = {}
            # articulation_points may yield a node once per biconnected
            # component it joins; keying by node id collapses those.
            for node_id in nx.articulation_points(self.graph):
                neighbour_communities = {
                    communities.get(n) for n in self.graph.neighbors(node_id)
                }
                bridge_nodes[node_id] = {
                    'betweenness': betweenness.get(node_id, 0.0),
                    'communities_connected': sorted(
                        c for c in neighbour_communities if c is not None
                    ),
                    'is_bridge': True,
                }

            self.metrics['bridge_nodes'] = bridge_nodes
            logger.info(f"Identified {len(bridge_nodes)} bridge nodes (articulation points)")
            return bridge_nodes
        except Exception as e:
            logger.error(f"Error identifying bridge nodes: {str(e)}")
            return {}
    
    def calculate_influence_tier(self):
        """Calculate influence tier based on centrality metrics.

        Tiers are assigned by rank (percentile) within the current network,
        not by fixed absolute score thresholds. Centrality values shrink as a
        network grows -- on a real, sparse network of a few hundred students,
        even the single most-connected node rarely clears an absolute score
        like 0.5, so fixed thresholds silently produce zero High/Medium
        students on any realistically-sized graph. Ranking students against
        each other stays meaningful regardless of network size or density.
        """
        if not all(key in self.metrics for key in ['degree_centrality', 'betweenness_centrality', 'closeness_centrality']):
            return {}

        try:
            degree = self.metrics['degree_centrality']
            betweenness = self.metrics['betweenness_centrality']
            closeness = self.metrics['closeness_centrality']

            # Weighted influence score per node
            scores = {}
            for node_id in self.graph.nodes():
                scores[node_id] = (
                    0.3 * degree.get(node_id, 0) +
                    0.3 * betweenness.get(node_id, 0) +
                    0.4 * closeness.get(node_id, 0)
                )

            # Top 10% = High, next 20% = Medium, rest = Low -- but a node with
            # zero score (no real connections at all) never counts as
            # influential just because ranking forced it into the top bracket.
            ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
            total = len(ranked)
            high_cutoff = max(1, round(total * 0.10)) if total > 0 else 0
            medium_cutoff = max(high_cutoff, round(total * 0.30))

            influence_tiers = {}
            for rank, (node_id, score) in enumerate(ranked):
                if score <= 0:
                    tier = 'Low'
                elif rank < high_cutoff:
                    tier = 'High'
                elif rank < medium_cutoff:
                    tier = 'Medium'
                else:
                    tier = 'Low'

                influence_tiers[node_id] = {
                    'score': score,
                    'tier': tier
                }

            self.metrics['influence_tiers'] = influence_tiers
            logger.info(
                f"Calculated influence tiers (percentile-based): "
                f"{sum(1 for v in influence_tiers.values() if v['tier'] == 'High')} High, "
                f"{sum(1 for v in influence_tiers.values() if v['tier'] == 'Medium')} Medium, "
                f"{sum(1 for v in influence_tiers.values() if v['tier'] == 'Low')} Low"
            )
            return influence_tiers
        except Exception as e:
            logger.error(f"Error calculating influence tiers: {str(e)}")
            return {}
    
    def run_full_analysis(self):
        """Run complete SNA analysis"""
        try:
            self.build_graph()
            self.calculate_degree_centrality()
            self.calculate_betweenness_centrality()
            self.calculate_closeness_centrality()
            self.calculate_eigenvector_centrality()
            self.calculate_pagerank()
            self.calculate_clustering_coefficient()
            self.detect_communities_louvain()
            self.identify_bridge_nodes()
            self.calculate_influence_tier()
            
            logger.info("Full SNA analysis completed successfully")
            return True
        except Exception as e:
            logger.error(f"Error running full analysis: {str(e)}")
            return False
    
    def save_metrics_to_db(self):
        """Save all calculated metrics to database"""
        try:
            if not self.metrics:
                logger.warning("No metrics to save")
                return False
            
            for student_id in self.graph.nodes():
                # Get or create metric record
                metric = NetworkMetric.query.filter_by(student_id=student_id).first()
                if not metric:
                    metric = NetworkMetric(student_id=student_id)
                
                # Update metrics
                metric.degree_centrality = self.metrics['degree_centrality'].get(student_id, 0)
                metric.betweenness_centrality = self.metrics['betweenness_centrality'].get(student_id, 0)
                metric.closeness_centrality = self.metrics['closeness_centrality'].get(student_id, 0)
                metric.eigenvector_centrality = self.metrics.get('eigenvector_centrality', {}).get(student_id, 0)
                metric.pagerank_score = self.metrics['pagerank'].get(student_id, 0)
                metric.clustering_coefficient = self.metrics['clustering_coefficient'].get(student_id, 0)
                metric.community_id = self.metrics['communities'].get(student_id, -1)
                
                influence_info = self.metrics['influence_tiers'].get(student_id, {})
                metric.influence_tier = influence_info.get('tier', 'Low')
                
                metric.bridge_node = student_id in self.metrics.get('bridge_nodes', {})
                
                db.session.add(metric)
            
            db.session.commit()
            logger.info("Metrics saved to database")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving metrics to database: {str(e)}")
            return False
    
    def get_top_influencers(self, limit=10):
        """Get top influencers by influence tier"""
        try:
            metrics = NetworkMetric.query.order_by(
                _TIER_RANK.desc(),
                NetworkMetric.degree_centrality.desc()
            ).limit(limit).all()

            result = []
            for metric in metrics:
                student = Student.query.get(metric.student_id)
                result.append({
                    'student': student.to_dict(),
                    'metrics': metric.to_dict()
                })

            return result
        except Exception as e:
            logger.error(f"Error getting top influencers: {str(e)}")
            return []
