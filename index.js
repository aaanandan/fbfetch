const axios = require('axios');
const fs = require('fs');
const path = require('path');

const FACEBOOK_PAGE_ID = 'your_page_id';
const ACCESS_TOKEN = 'your_access_token';
const TARGET_DATE = '2024-06-30'; // Format: YYYY-MM-DD
const API_ENDPOINT = 'https://yourapiendpoint.com/update';
const MEDIA_DIR = './media'; // Directory to save downloaded media files

// Create media directory if it doesn't exist
if (!fs.existsSync(MEDIA_DIR)) {
    fs.mkdirSync(MEDIA_DIR);
}

const fetchPosts = async (pageId, accessToken, targetDate) => {
    const url = `https://graph.facebook.com/${pageId}/posts`;
    const params = {
        access_token: accessToken,
        since: `${targetDate}T00:00:00`,
        until: `${targetDate}T23:59:59`,
        fields: 'id,created_time,message,place,attachments'
    };

    try {
        const response = await axios.get(url, { params });
        return response.data.data;
    } catch (error) {
        console.error('Error fetching posts:', error);
        return [];
    }
};

const downloadMedia = async (mediaUrl, filename) => {
    const filePath = path.join(MEDIA_DIR, filename);
    const writer = fs.createWriteStream(filePath);

    const response = await axios({
        url: mediaUrl,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

const updateApiEndpoint = async (apiEndpoint, data) => {
    try {
        const response = await axios.post(apiEndpoint, data);
        console.log('Successfully updated the API endpoint:', response.data);
    } catch (error) {
        console.error('Error updating the API endpoint:', error);
    }
};

const main = async () => {
    const posts = await fetchPosts(FACEBOOK_PAGE_ID, ACCESS_TOKEN, TARGET_DATE);

    if (posts.length === 0) {
        console.log('No posts found for the given date.');
        return;
    }

    for (const post of posts) {
        const postData = {
            id: post.id,
            date: post.created_time,
            location: post.place ? post.place.name : null,
            title: post.message ? post.message.split('\n')[0] : null,
            media: []
        };

        if (post.attachments) {
            for (const attachment of post.attachments.data) {
                if (attachment.type === 'photo' || attachment.type === 'video') {
                    const mediaUrl = attachment.media.image.src;
                    const filename = `${post.id}_${attachment.type}.${attachment.type === 'photo' ? 'jpg' : 'mp4'}`;
                    
                    await downloadMedia(mediaUrl, filename);
                    postData.media.push({ type: attachment.type, url: mediaUrl, filename: filename });
                }
            }
        }

        await updateApiEndpoint(API_ENDPOINT, postData);
    }
};

main();
