import {connect} from 'react-redux'
import ReactNotifications, * as notifications from 'react-notification-system-redux'

const mapStateToProps = (state) => {
    return ({
        notifications: state.notifications,
        style: {
            NotificationItem: {
                DefaultStyle: {
                    fontSize:  '.8rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#fff',
                    lineHeight: '1.5'
                }
            },
            Title: {
                DefaultStyle: {
                    fontSize: '.8rem'
                }
            }
        }
    })
}

const Notifications = connect(mapStateToProps)(ReactNotifications)
Notifications.show = notifications.show
Notifications.success = notifications.success
Notifications.error = notifications.error
Notifications.warning = notifications.warning
Notifications.info = notifications.info
Notifications.hide = notifications.hide
Notifications.removeAll = notifications.removeAll
export default Notifications