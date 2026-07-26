from flask import Blueprint, request, jsonify
from app.models import db, Campaign, Student
from app.utils.decorators import campaign_manager_required
from app.services.activity_service import ActivityService
import logging

logger = logging.getLogger(__name__)

campaigns_bp = Blueprint('campaigns', __name__)

@campaigns_bp.route('/', methods=['GET'], strict_slashes=False)
@campaign_manager_required
def get_campaigns():
    """Get all campaigns"""
    try:
        status = request.args.get('status')
        manager_id = request.args.get('manager_id')
        
        query = Campaign.query
        
        if status:
            query = query.filter_by(status=status)
        if manager_id:
            query = query.filter_by(manager_id=int(manager_id))
        
        campaigns = query.all()
        
        return jsonify({
            'success': True,
            'count': len(campaigns),
            'campaigns': [c.to_dict() for c in campaigns]
        }), 200
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@campaigns_bp.route('/<int:campaign_id>', methods=['GET'])
@campaign_manager_required
def get_campaign(campaign_id):
    """Get single campaign"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'success': False, 'error': 'Campaign not found'}), 404
        
        manager = Student.query.get(campaign.manager_id)
        
        return jsonify({
            'success': True,
            'campaign': campaign.to_dict(),
            'manager': manager.to_dict() if manager else None
        }), 200
    except Exception as e:
        logger.error(f"Error fetching campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@campaigns_bp.route('/', methods=['POST'], strict_slashes=False)
@campaign_manager_required
def create_campaign():
    """Create a new campaign"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['campaign_id', 'campaign_name', 'manager_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'Missing field: {field}'}), 400
        
        # Check if campaign already exists
        if Campaign.query.filter_by(campaign_id=data['campaign_id']).first():
            return jsonify({'success': False, 'error': 'Campaign ID already exists'}), 400
        
        # Check if manager exists
        if not Student.query.get(data['manager_id']):
            return jsonify({'success': False, 'error': 'Manager not found'}), 404
        
        campaign = Campaign(
            campaign_id=data['campaign_id'],
            campaign_name=data['campaign_name'],
            description=data.get('description'),
            manager_id=data['manager_id'],
            target_party=data.get('target_party'),
            status=data.get('status', 'planning')
        )
        
        db.session.add(campaign)
        db.session.commit()

        logger.info(f"Created campaign: {campaign.campaign_id}")
        ActivityService.log('campaign_created', f"Created campaign '{campaign.campaign_name}'")

        return jsonify({
            'success': True,
            'campaign': campaign.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@campaigns_bp.route('/<int:campaign_id>', methods=['PUT'])
@campaign_manager_required
def update_campaign(campaign_id):
    """Update a campaign"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'success': False, 'error': 'Campaign not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'campaign_name' in data:
            campaign.campaign_name = data['campaign_name']
        if 'description' in data:
            campaign.description = data['description']
        if 'target_party' in data:
            campaign.target_party = data['target_party']
        if 'status' in data:
            campaign.status = data['status']
        if 'end_date' in data:
            campaign.end_date = data['end_date']
        
        db.session.commit()
        logger.info(f"Updated campaign: {campaign.campaign_id}")
        
        return jsonify({
            'success': True,
            'campaign': campaign.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@campaigns_bp.route('/<int:campaign_id>', methods=['DELETE'])
@campaign_manager_required
def delete_campaign(campaign_id):
    """Delete a campaign"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'success': False, 'error': 'Campaign not found'}), 404

        campaign_name = campaign.campaign_name
        db.session.delete(campaign)
        db.session.commit()

        logger.info(f"Deleted campaign: {campaign.campaign_id}")
        ActivityService.log('campaign_deleted', f"Deleted campaign '{campaign_name}'")

        return jsonify({'success': True, 'message': 'Campaign deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting campaign: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@campaigns_bp.route('/<int:campaign_id>/recommendations', methods=['GET'])
@campaign_manager_required
def get_campaign_recommendations(campaign_id):
    """Get outreach recommendations (top influencers + bridge nodes) for a
    campaign, filtered by its target party when one is set."""
    try:
        from app.models import NetworkMetric

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'success': False, 'error': 'Campaign not found'}), 404

        limit = request.args.get('limit', 10, type=int)

        base_query = db.session.query(NetworkMetric, Student).join(
            Student, NetworkMetric.student_id == Student.id
        )
        if campaign.target_party:
            base_query = base_query.filter(Student.party == campaign.target_party)

        top_influencers = base_query.order_by(
            NetworkMetric.influence_tier.desc(), NetworkMetric.degree_centrality.desc()
        ).limit(limit).all()

        bridge_nodes = base_query.filter(NetworkMetric.bridge_node.is_(True)).order_by(
            NetworkMetric.betweenness_centrality.desc()
        ).limit(limit).all()

        return jsonify({
            'success': True,
            'campaign': campaign.to_dict(),
            'target_party': campaign.target_party,
            'top_influencers': [
                {'student': s.to_dict(), 'metrics': m.to_dict()} for m, s in top_influencers
            ],
            'bridge_nodes': [
                {'student': s.to_dict(), 'metrics': m.to_dict()} for m, s in bridge_nodes
            ],
        }), 200
    except Exception as e:
        logger.error(f"Error getting campaign recommendations: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
