import networkx as nx

from app.services.sna_engine import SNAEngine


def _engine_with(graph, communities=None):
    engine = SNAEngine()
    engine.graph = graph
    engine.metrics = {
        'betweenness_centrality': nx.betweenness_centrality(graph),
        'communities': communities if communities is not None
        else {n: 0 for n in graph.nodes()},
    }
    return engine


def test_bridge_node_found_in_a_simple_chain():
    """B joins A and C; removing it splits the graph, so B is the bridge."""
    g = nx.Graph([('A', 'B'), ('B', 'C')])
    bridges = _engine_with(g).identify_bridge_nodes()
    assert set(bridges) == {'B'}


def test_no_bridge_in_a_triangle():
    """Every node has an alternative route, so nothing is a cut vertex."""
    g = nx.Graph([('A', 'B'), ('B', 'C'), ('C', 'A')])
    assert _engine_with(g).identify_bridge_nodes() == {}


def test_bridges_found_when_louvain_gives_each_component_its_own_community():
    """Regression for the bug that reported zero bridges on real data.

    Survey data fragments into many small components, and Louvain labels
    each one a separate community -- so a node's neighbours never span two
    communities. Detection must not depend on that condition.
    """
    # Two separate stars: 1-2-3 and 4-5-6, each a component of its own.
    g = nx.Graph([(1, 2), (2, 3), (4, 5), (5, 6)])
    communities = {1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1}

    bridges = _engine_with(g, communities).identify_bridge_nodes()

    # 2 and 5 are the centres; removing either splits its component.
    assert set(bridges) == {2, 5}
    for info in bridges.values():
        # Neighbours sit in a single community -- previously fatal.
        assert len(info['communities_connected']) == 1
        assert info['is_bridge'] is True


def test_isolated_and_paired_students_are_never_bridges():
    g = nx.Graph()
    g.add_node('alone')
    g.add_edge('x', 'y')
    assert _engine_with(g).identify_bridge_nodes() == {}
