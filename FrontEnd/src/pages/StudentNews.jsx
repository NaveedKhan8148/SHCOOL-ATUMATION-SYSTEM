import React from 'react';
import { Card, List, Typography } from 'antd';
import { newsItems } from '../data/news';

const { Title, Text } = Typography;

const StudentNews = () => {
    return (
        <div>
            <Title level={2}>News & announcements</Title>
            <Text type="secondary">Latest updates from administration (static demo content).</Text>
            <Card style={{ marginTop: 16 }}>
                <List
                    itemLayout="vertical"
                    dataSource={newsItems}
                    renderItem={(item) => (
                        <List.Item key={item.key}>
                            <List.Item.Meta title={item.title} description={`${item.date} — ${item.author}`} />
                            <p style={{ margin: 0 }}>{item.summary}</p>
                        </List.Item>
                    )}
                />
            </Card>
        </div>
    );
};

export default StudentNews;
