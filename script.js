// script.js

const STRAPI_API_URL = "https://my-strapi-backend-service.onrender.com/api"; // កំណត់ API URL របស់ Strapi Backend
const appRoot = document.getElementById("app-root"); // ទទួលបាន Element ដែលត្រូវបង្ហាញមាតិកា

/**
 * មុខងារសម្រាប់ទាញយកបញ្ជីអត្ថបទទាំងអស់ពី Strapi API ។
 * រួមបញ្ចូលព័ត៌មាន Author, Categories, Tags និង Featured Image តាមរយៈ populate ។
 */
async function fetchArticles() {
  try {
    const response = await fetch(`${STRAPI_API_URL}/articles?populate=*`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data; // Strapi V4 រុំទិន្នន័យនៅក្នុង object "data"
  } catch (error) {
    console.error("Error fetching articles:", error);
    appRoot.innerHTML =
      '<p style="color: red;">មានបញ្ហាក្នុងការទាញយកអត្ថបទ។ សូមព្យាយាមម្តងទៀតពេលក្រោយ។</p>';
    return [];
  }
}

/**
 * មុខងារសម្រាប់បង្ហាញបញ្ជីអត្ថបទទាំងអស់នៅលើទំព័រដើម។
 */
async function renderArticles() {
  appRoot.innerHTML = "<h2>កំពុងទាញយកអត្ថបទ...</h2>"; // បង្ហាញសារ "Loading"
  const articles = await fetchArticles();

  if (articles.length === 0) {
    appRoot.innerHTML = "<p>មិនទាន់មានអត្ថបទនៅឡើយទេ!</p>";
    return;
  }

  let articlesHtml = '<div class="articles-grid">';
  articles.forEach((article) => {
    // Support both Strapi v4 format and plain object format
    const attrs = article.attributes ? article.attributes : article;

    if (!attrs) {
      console.warn("Skipping malformed article:", article);
      return;
    }

    const title = attrs.title;
    const slug = attrs.slug;
    const shortDescription = attrs.shortDescription || "";
    const authorName =
      attrs.author?.data?.attributes?.name || attrs.author?.name || "មិនស្គាល់";
    const featuredImageUrl = attrs.featuredImage?.url ? attrs.featuredImage.url : "https://via.placeholder.com/400x200.png?text=No+Image";

    const categories =
      attrs.categories?.data
        ?.map(
          (cat) => `<span class="category-tag">${cat.attributes.name}</span>`
        )
        .join("") || "";

    const tags =
      attrs.tags?.data
        ?.map((tag) => `<span class="tag-item">${tag.attributes.name}</span>`)
        .join("") || "";

    articlesHtml += `
            <div class="article-card">
                <img src="${featuredImageUrl}" alt="${title}">
                <div class="article-card-content">
                    <h3><a href="#" onclick="navigateToArticle('${slug}'); return false;">${title}</a></h3>
                    <p>${shortDescription}</p>
                    <p class="meta">ផ្សាយដោយ: ${authorName}</p>
                    <div class="flex-wrap">
                        ${categories}
                        ${tags}
                    </div>
                </div>
            </div>
        `;
  });
  articlesHtml += "</div>";
  appRoot.innerHTML = articlesHtml;
}

function renderRichText(contentBlocks) {
  const contents = document.createElement('div'); // Create a document to hold the rendered content

  contentBlocks.forEach((block) => {
    let element;
    switch (block.type) {
      case "paragraph":
        element = document.createElement("p");
        break;
      case "heading":
        // Strapi's heading blocks have a 'level' property (e.g., 1 for h1, 2 for h2)
        element = document.createElement(`h${block.level}`);
        break;
      case "list":
        // Strapi's list blocks have a 'format' property ('unordered' or 'ordered')
        element = document.createElement(
          block.format === "unordered" ? "ul" : "ol"
        );
        break;
      case "list-item":
        // List items are handled within the list rendering logic,
        // but this case is here for completeness if needed elsewhere.
        element = document.createElement("li");
        break;
      case "image":
        element = document.createElement("img");
        // Assuming 'image' block has a 'url' property in its attributes
        // In a real Strapi setup, you might have 'url' nested under 'file' or similar
        element.src =
          block.image.url ||
          "https://placehold.co/600x300/F0F4F8/4A5568?text=Image+Placeholder"; // Fallback
        if (block.image.alt) element.alt = block.image.alt;
        if (block.image.width) element.style.width = `${block.image.width}px`;
        if (block.image.height)
          element.style.height = `${block.image.height}px`;
        break;
      // Add more cases for other block types as needed (e.g., quote, code, table)
      default:
        console.warn(`Unknown block type: ${block.type}. Skipping.`);
        return; // Skip unknown block types
    }

    // Recursively render children for blocks that have them
    if (block.children && block.children.length > 0) {
      block.children.forEach((child) => {
        let childNode;
        if (child.type === "text") {
          childNode = document.createTextNode(child.text);

          // Apply text formatting (bold, italic, underline, strikethrough, code)
          if (child.bold) {
            const strong = document.createElement("strong");
            strong.appendChild(childNode);
            childNode = strong;
          }
          if (child.italic) {
            const em = document.createElement("em");
            em.appendChild(childNode);
            childNode = em;
          }
          // Add more text formatting as needed (e.g., underline, strikethrough, code)
        } else if (child.type === "link") {
          // Handle link children
          const a = document.createElement("a");
          a.href = child.url;
          a.target = "_blank"; // Open links in a new tab
          // Recursively render children of the link (usually text)
          if (child.children && child.children.length > 0) {
            child.children.forEach((linkChild) => {
              if (linkChild.type === "text") {
                a.appendChild(document.createTextNode(linkChild.text));
              }
            });
          }
          childNode = a;
        } else if (child.type === "list-item") {
          // Handle list items specifically within a list context
          const li = document.createElement("li");
          // Recursively render children of the list item
          li.appendChild(renderRichText([child])); // Pass as an array for consistent processing
          childNode = li;
        } else {
          console.warn(`Unknown child type: ${child.type}. Skipping.`);
          return;
        }
        element.appendChild(childNode);
      });
    }

    // For list-items, they are appended to the list element, not directly to the fragment
    // This logic ensures list-items are correctly nested.
    if (block.type === "list-item") {
      // If the list-item has children that are also list-items (nested lists),
      // this recursive call handles them.
      if (
        block.children &&
        block.children.some((c) => c.type === "list" || c.type === "list-item")
      ) {
        contents.appendChild(element); // Append the li to the fragment for now, parent will handle it
      } else {
        contents.appendChild(element);
      }
    } else {
      contents.appendChild(element);
    }
  });

  return contents.outerHTML; // Return the HTML string of the rendered content
}
/**
 * មុខងារសម្រាប់ទាញយកអត្ថបទតែមួយតាម Slug ។
 */
async function fetchArticleBySlug(slug) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/articles?filters[slug][$eq]=${slug}&populate=*`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data[0]; // ត្រឡប់ Entry ដំបូងព្រោះ filter នឹងត្រឡប់ Array
  } catch (error) {
    console.error("Error fetching single article:", error);
    return null;
  }
}

/**
 * មុខងារសម្រាប់បង្ហាញអត្ថបទលម្អិត។
 */
async function renderSingleArticle(slug) {
  appRoot.innerHTML = "<h2>កំពុងទាញយកអត្ថបទលម្អិត...</h2>";
  const article = await fetchArticleBySlug(slug);

  if (!article) {
    appRoot.innerHTML = '<p style="color: red;">អត្ថបទនេះរកមិនឃើញទេ!</p>';
    return;
  }

  // Support both Strapi v4 format and plain object format
  const attrs = article.attributes ? article.attributes : article;

  const title = attrs.title;
  const content = attrs.content; // Rich Text (HTML)
  const authorName =
    attrs.author?.data?.attributes?.name || attrs.author?.name || "មិនស្គាល់";
  const publishedDate = attrs.publishedAt
    ? new Date(attrs.publishedAt).toLocaleDateString("km-KH")
    : "";
  const featuredImageUrl = attrs.featuredImage?.url ? attrs.featuredImage.url : "https://via.placeholder.com/800x400.png?text=No+Image";

  const categories =
    attrs.categories
      ?.map((cat) => `<span class="category-tag">${cat.name}</span>`)
      .join("") || "";

  const tags =
    attrs.tags
      ?.map((tag) => `<span class="tag-item">${tag.name}</span>`)
      .join("") || "";

  appRoot.innerHTML = `
        <div class="article-details">
            <img src="${featuredImageUrl}" alt="${title}">
            <h1>${title}</h1>
            <p class="meta">ផ្សាយដោយ: ${authorName} នៅថ្ងៃ ${publishedDate}</p>
            <div class="content">
                ${renderRichText(content)}
            </div>
            <div class="categories">
                <strong>ប្រភេទ:</strong> ${categories}
            </div>
            <div class="tags">
                <strong>ស្លាក:</strong> ${tags}
            </div>
        </div>
    `;
}

/**
 * មុខងារសម្រាប់គ្រប់គ្រង Routing សាមញ្ញដោយប្រើ URL Hash (#) ។
 * វាពិនិត្យមើល URL Hash ដើម្បីកំណត់ថាតើត្រូវបង្ហាញបញ្ជីអត្ថបទ ឬអត្ថបទលម្អិត។
 */
function handleRoute() {
  const hash = window.location.hash; // ឧទាហរណ៍: #articles/my-first-article
  if (hash.startsWith("#articles/")) {
    const slug = hash.substring("#articles/".length);
    renderSingleArticle(slug);
  } else {
    renderArticles(); // បង្ហាញបញ្ជីអត្ថបទនៅពេលគ្មាន Hash ឬ Hash មិនត្រូវគ្នា
  }
}

/**
 * មុខងារសម្រាប់ផ្លាស់ប្តូរ URL Hash ដោយមិន Reload ទំព័រ។
 * ត្រូវបានប្រើនៅពេលចុចលើ Link អត្ថបទ។
 */
function navigateToArticle(slug) {
  window.location.hash = `articles/${slug}`;
  // មុខងារ handleRoute() នឹងត្រូវបានហៅដោយ event 'hashchange' ដោយស្វ័យប្រវត្តិ
}

// Event Listeners:
// 1. នៅពេលទំព័រត្រូវបាន Load ពេញលេញ ហៅ handleRoute() ដើម្បីបង្ហាញមាតិកាដំបូង។
document.addEventListener("DOMContentLoaded", () => {
  handleRoute();
  // 2. កំណត់ Event Listener សម្រាប់ Link "ទំព័រដើម" ដើម្បីត្រឡប់ទៅបញ្ជីអត្ថបទ។
  document.getElementById("homeLink").addEventListener("click", (e) => {
    e.preventDefault(); // ទប់ស្កាត់ការ Reload ទំព័រលំនាំដើមរបស់ Browser
    window.location.hash = ""; // លុប Hash ចោលដើម្បីត្រឡប់ទៅទំព័រដើម
  });
});

// 3. កំណត់ Event Listener សម្រាប់ពេល URL Hash ផ្លាស់ប្តូរ ដើម្បីដំណើរការ Routing ឡើងវិញ។
window.addEventListener("hashchange", handleRoute);
